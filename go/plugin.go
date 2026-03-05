package csv

import (
	"strconv"
	"strings"

	jsonic "github.com/jsonicjs/jsonic/go"
)

// Csv is a jsonic plugin that adds CSV parsing support.
// It mirrors the TypeScript Csv plugin, defining grammar rules
// (csv, newline, record, list, elem, val, text) and a custom
// CSV string matcher.
func Csv(j *jsonic.Jsonic, pluginOpts map[string]any) {
	csvOpts := mapToOptions(pluginOpts)
	opts := resolve(&csvOpts)

	strict := opts.strict
	objres := opts.object
	header := opts.header
	trim := opts.trim
	comment := opts.comment
	optNumber := opts.number
	optValue := opts.value
	recordEmpty := opts.recordEmpty
	stream := opts.stream

	// In strict mode, disable JSON structure tokens and Jsonic field content parsing.
	if strict {
		useCsvString := true
		if opts.csvString != nil && !*opts.csvString {
			useCsvString = false
		}
		if useCsvString {
			j.AddMatcher("stringcsv", 100000, buildCsvStringMatcher(opts, j))
		}
		// Disable JSON structure tokens in strict mode.
		cfg := j.Config()
		delete(cfg.FixedTokens, "{")
		delete(cfg.FixedTokens, "}")
		delete(cfg.FixedTokens, "[")
		delete(cfg.FixedTokens, "]")
		delete(cfg.FixedTokens, ":")
		cfg.SortFixedTokens()

		// Exclude jsonic and imp rule groups.
		j.Exclude("jsonic", "imp")
	} else {
		useCsvString := false
		if opts.csvString != nil && *opts.csvString {
			useCsvString = true
		}
		if useCsvString {
			j.AddMatcher("stringcsv", 100000, buildCsvStringMatcher(opts, j))
		}
		if csvOpts.Trim == nil {
			trim = true
		}
		if csvOpts.Comment == nil {
			comment = true
		}
		if csvOpts.Number == nil {
			optNumber = true
		}
		j.Exclude("imp")
	}

	// Custom "comma" (field separator)
	if opts.fieldSep != "," {
		cfg := j.Config()
		// Remove old comma mapping
		delete(cfg.FixedTokens, ",")
		// Add custom separator
		j.Token("#CA", opts.fieldSep)
		cfg.SortFixedTokens()
	}

	cfg := j.Config()

	// Configure number/value/comment lexing
	cfg.NumberLex = optNumber
	cfg.ValueLex = optValue
	cfg.CommentLex = comment

	// When comments are disabled, clear comment line starters so the text matcher
	// doesn't stop at '#' or '//'. Otherwise '#' becomes unmatchable.
	if !comment {
		cfg.CommentLine = nil
		cfg.CommentBlock = nil
	}

	// Set start rule
	cfg.RuleStart = "csv"

	if opts.recordSep != "" {
		cfg.LineChars = make(map[rune]bool)
		cfg.RowChars = make(map[rune]bool)
		for _, ch := range opts.recordSep {
			cfg.LineChars[ch] = true
			cfg.RowChars[ch] = true
		}
	}

	// Register custom token types that are NOT in jsonic's global IGNORE set.
	// In the TS version, the IGNORE set is configurable per-instance.
	// In Go, TinSetIGNORE is a global map, so we use custom tokens instead.
	RL := j.Token("#RL") // Record Line (non-ignored LN equivalent)
	RS := j.Token("#RS") // Record Space (non-ignored SP equivalent)

	// Intercept the line matcher: emit #RL instead of #LN so it's not ignored.
	// Each line ending (\n or \r\n) is emitted as a separate token so the grammar
	// can distinguish multiple newlines (important for empty record handling).
	cfg.LineCheck = func(lex *jsonic.Lex) *jsonic.LexCheckResult {
		pnt := lex.Cursor()
		src := lex.Src
		sI := pnt.SI
		rI := pnt.RI
		if sI >= pnt.Len {
			return nil
		}
		if !cfg.LineChars[rune(src[sI])] {
			return nil
		}
		startI := sI
		// Consume one line ending: \r\n or \r or \n
		if src[sI] == '\r' {
			sI++
			if sI < pnt.Len && src[sI] == '\n' {
				sI++
			}
			rI++
		} else if cfg.LineChars[rune(src[sI])] {
			if cfg.RowChars[rune(src[sI])] {
				rI++
			}
			sI++
		}
		tkn := lex.Token("#RL", RL, nil, src[startI:sI])
		pnt.SI = sI
		pnt.RI = rI
		pnt.CI = 1
		return &jsonic.LexCheckResult{Done: true, Token: tkn}
	}

	// In strict mode, also intercept space to emit #RS.
	// In non-strict mode, spaces are handled by the grammar too.
	cfg.SpaceCheck = func(lex *jsonic.Lex) *jsonic.LexCheckResult {
		pnt := lex.Cursor()
		src := lex.Src
		sI := pnt.SI
		cI := pnt.CI
		if sI >= pnt.Len {
			return nil
		}
		if !cfg.SpaceChars[rune(src[sI])] {
			return nil
		}
		startI := sI
		for sI < pnt.Len && cfg.SpaceChars[rune(src[sI])] {
			sI++
			cI++
		}
		tkn := lex.Token("#RS", RS, nil, src[startI:sI])
		pnt.SI = sI
		pnt.CI = cI
		return &jsonic.LexCheckResult{Done: true, Token: tkn}
	}

	// Get token Tins - use our custom non-ignored tokens
	LN := RL // Use RL (non-ignored) instead of LN (ignored)
	CA := j.Token("#CA")
	SP := RS // Use RS (non-ignored) instead of SP (ignored)
	ZZ := j.Token("#ZZ")
	VAL := j.TokenSet("VAL") // [TX, NR, ST, VL]

	// ======= csv rule (starting rule) =======
	j.Rule("csv", func(rs *jsonic.RuleSpec) {
		rs.Clear()

		rs.AddBO(func(r *jsonic.Rule, ctx *jsonic.Context) {
			if ctx.Meta == nil {
				ctx.Meta = make(map[string]any)
			}
			ctx.Meta["recordI"] = 0
			if stream != nil {
				stream("start", nil)
			}
			r.Node = make([]any, 0)
		})

		openAlts := []*jsonic.AltSpec{
			// End immediately if EOF
			{S: [][]jsonic.Tin{{ZZ}}},
		}
		// Ignore empty lines from the start (if not preserving empty records)
		if !recordEmpty {
			openAlts = append(openAlts, &jsonic.AltSpec{S: [][]jsonic.Tin{{LN}}, P: "newline"})
		}
		// Look for the first record
		openAlts = append(openAlts, &jsonic.AltSpec{P: "record"})
		rs.Open = openAlts

		rs.AddAC(func(r *jsonic.Rule, ctx *jsonic.Context) {
			if stream != nil {
				stream("end", nil)
			}
		})
	})

	// ======= newline rule =======
	j.Rule("newline", func(rs *jsonic.RuleSpec) {
		rs.Clear()
		rs.Open = []*jsonic.AltSpec{
			{S: [][]jsonic.Tin{{LN}, {LN}}, R: "newline"},
			{S: [][]jsonic.Tin{{LN}}, R: "newline"},
			{S: [][]jsonic.Tin{{ZZ}}},
			{R: "record"},
		}
		rs.Close = []*jsonic.AltSpec{
			{S: [][]jsonic.Tin{{LN}, {LN}}, R: "newline"},
			{S: [][]jsonic.Tin{{LN}}, R: "newline"},
			{S: [][]jsonic.Tin{{ZZ}}},
			{R: "record"},
		}
	})

	// ======= record rule =======
	j.Rule("record", func(rs *jsonic.RuleSpec) {
		rs.Clear()

		rs.Open = []*jsonic.AltSpec{
			{P: "list"},
		}

		closeAlts := []*jsonic.AltSpec{
			{S: [][]jsonic.Tin{{ZZ}}},
			{S: [][]jsonic.Tin{{LN}, {ZZ}}, B: 1},
		}
		if recordEmpty {
			closeAlts = append(closeAlts, &jsonic.AltSpec{S: [][]jsonic.Tin{{LN}}, R: "record"})
		} else {
			closeAlts = append(closeAlts, &jsonic.AltSpec{S: [][]jsonic.Tin{{LN}}, R: "newline"})
		}
		rs.Close = closeAlts

		rs.AddBC(func(r *jsonic.Rule, ctx *jsonic.Context) {
			recordI, _ := ctx.Meta["recordI"].(int)
			fields := ctx.Meta["fields"]
			fieldNames := opts.fieldNames

			var fieldSlice []string
			if fields != nil {
				if fs, ok := fields.([]string); ok {
					fieldSlice = fs
				}
			}
			if fieldSlice == nil && fieldNames != nil {
				fieldSlice = fieldNames
			}

			// First line is fields if header=true
			if recordI == 0 && header {
				// Extract header names from child node
				if childArr, ok := r.Child.Node.([]any); ok {
					names := make([]string, len(childArr))
					for i, v := range childArr {
						if s, ok := v.(string); ok {
							names[i] = s
						} else {
							names[i] = ""
						}
					}
					ctx.Meta["fields"] = names
				} else {
					ctx.Meta["fields"] = []string{}
				}
			} else {
				// A normal record line
				var rawRecord []any
				if childArr, ok := r.Child.Node.([]any); ok {
					rawRecord = childArr
				} else {
					rawRecord = []any{}
				}

				if objres {
					obj := make(map[string]any)
					var keys []string
					i := 0
					if fieldSlice != nil {
						for fI := 0; fI < len(fieldSlice); fI++ {
							var val any
							if fI < len(rawRecord) {
								val = rawRecord[fI]
							} else {
								val = opts.emptyField
							}
							obj[fieldSlice[fI]] = val
							keys = append(keys, fieldSlice[fI])
						}
						i = len(fieldSlice)
					}
					// Handle extra unnamed fields
					for ; i < len(rawRecord); i++ {
						fieldName := opts.noNamePrefix + strconv.Itoa(i)
						val := rawRecord[i]
						obj[fieldName] = val
						keys = append(keys, fieldName)
					}

					record := orderedMap{keys: keys, m: obj}
					if stream != nil {
						stream("record", record)
					} else {
						if arr, ok := r.Node.([]any); ok {
							r.Node = append(arr, record)
							// Propagate updated slice up through parent chain
							// (Go slices may reallocate on append)
							if r.Parent != jsonic.NoRule && r.Parent != nil {
								r.Parent.Node = r.Node
							}
						}
					}
				} else {
					// Return records as arrays
					for i := 0; i < len(rawRecord); i++ {
						if rawRecord[i] == nil {
							rawRecord[i] = opts.emptyField
						}
					}
					if stream != nil {
						stream("record", rawRecord)
					} else {
						if arr, ok := r.Node.([]any); ok {
							r.Node = append(arr, rawRecord)
							if r.Parent != jsonic.NoRule && r.Parent != nil {
								r.Parent.Node = r.Node
							}
						}
					}
				}
			}
			ctx.Meta["recordI"] = recordI + 1
		})
	})

	// ======= list rule =======
	j.Rule("list", func(rs *jsonic.RuleSpec) {
		rs.Clear()
		rs.AddBO(func(r *jsonic.Rule, ctx *jsonic.Context) {
			r.Node = make([]any, 0)
		})
		rs.Open = []*jsonic.AltSpec{
			// If at end of line, backtrack (empty record)
			{S: [][]jsonic.Tin{{LN}}, B: 1},
			// Otherwise, start parsing elements
			{P: "elem"},
		}
		rs.Close = []*jsonic.AltSpec{
			// LN ends record
			{S: [][]jsonic.Tin{{LN}}, B: 1},
			{S: [][]jsonic.Tin{{ZZ}}},
		}
	})

	// ======= elem rule =======
	j.Rule("elem", func(rs *jsonic.RuleSpec) {
		rs.Clear()

		rs.Open = []*jsonic.AltSpec{
			// An empty element (comma without value before it)
			{S: [][]jsonic.Tin{{CA}}, B: 1,
				A: func(r *jsonic.Rule, ctx *jsonic.Context) {
					if arr, ok := r.Node.([]any); ok {
						r.Node = append(arr, opts.emptyField)
						if r.Parent != jsonic.NoRule && r.Parent != nil {
							r.Parent.Node = r.Node
						}
					}
					r.U["done"] = true
				}},
			// Normal element - delegate to val
			{P: "val"},
		}

		rs.Close = []*jsonic.AltSpec{
			// An empty element at the end of the line: CA followed by LN or ZZ
			{S: [][]jsonic.Tin{{CA}, {LN, ZZ}}, B: 1,
				A: func(r *jsonic.Rule, ctx *jsonic.Context) {
					if arr, ok := r.Node.([]any); ok {
						r.Node = append(arr, opts.emptyField)
						if r.Parent != jsonic.NoRule && r.Parent != nil {
							r.Parent.Node = r.Node
						}
					}
				}},
			// Comma means next element
			{S: [][]jsonic.Tin{{CA}}, R: "elem"},
			// LN ends record
			{S: [][]jsonic.Tin{{LN}}, B: 1},
			// EOF ends record
			{S: [][]jsonic.Tin{{ZZ}}},
		}

		rs.AddBC(func(r *jsonic.Rule, ctx *jsonic.Context) {
			done, _ := r.U["done"].(bool)
			if !done && !jsonic.IsUndefined(r.Child.Node) {
				if arr, ok := r.Node.([]any); ok {
					r.Node = append(arr, r.Child.Node)
					if r.Parent != jsonic.NoRule && r.Parent != nil {
						r.Parent.Node = r.Node
					}
				}
			}
		})
	})

	// ======= val rule =======
	j.Rule("val", func(rs *jsonic.RuleSpec) {
		rs.Clear()

		rs.AddBO(func(r *jsonic.Rule, ctx *jsonic.Context) {
			r.Node = jsonic.Undefined
		})

		rs.Open = []*jsonic.AltSpec{
			// Handle text and space concatenation
			{S: [][]jsonic.Tin{VAL, {SP}}, B: 2, P: "text"},
			{S: [][]jsonic.Tin{{SP}}, B: 1, P: "text"},
			// Plain value (no trailing space)
			{S: [][]jsonic.Tin{VAL}},
			// LN ends record
			{S: [][]jsonic.Tin{{LN}}, B: 1},
		}

		rs.AddBC(func(r *jsonic.Rule, ctx *jsonic.Context) {
			if jsonic.IsUndefined(r.Node) {
				if jsonic.IsUndefined(r.Child.Node) {
					if r.OS == 0 {
						r.Node = jsonic.Undefined
					} else {
						r.Node = r.O0.ResolveVal()
					}
				} else {
					r.Node = r.Child.Node
				}
			}
		})
	})

	// ======= text rule =======
	j.Rule("text", func(rs *jsonic.RuleSpec) {
		rs.Clear()

		rs.Open = []*jsonic.AltSpec{
			// Space within non-space is preserved as part of text value
			{S: [][]jsonic.Tin{VAL, {SP}}, B: 1, R: "text",
				N: map[string]int{"text": 1},
				G: "csv,space,follows",
				A: func(r *jsonic.Rule, ctx *jsonic.Context) {
					textN := r.N["text"]
					var val string
					if textN == 1 {
						val = ""
					} else if r.Prev != nil && r.Prev != jsonic.NoRule {
						if s, ok := r.Prev.Node.(string); ok {
							val = s
						}
					}
					result := val + tokenStr(r.O0)
					r.Node = result
					if textN == 1 {
						// first text rule
					} else if r.Prev != nil && r.Prev != jsonic.NoRule {
						r.Prev.Node = result
					}
				}},

			// SP VAL
			{S: [][]jsonic.Tin{{SP}, VAL}, R: "text",
				N: map[string]int{"text": 1},
				G: "csv,space,leads",
				A: func(r *jsonic.Rule, ctx *jsonic.Context) {
					textN := r.N["text"]
					var val string
					if textN == 1 {
						val = ""
					} else if r.Prev != nil && r.Prev != jsonic.NoRule {
						if s, ok := r.Prev.Node.(string); ok {
							val = s
						}
					}
					spaceStr := ""
					if textN >= 2 || !trim {
						spaceStr = r.O0.Src
					}
					result := val + spaceStr + r.O1.Src
					r.Node = result
					if textN == 1 {
						// first
					} else if r.Prev != nil && r.Prev != jsonic.NoRule {
						r.Prev.Node = result
					}
				}},

			// SP [CA, LN, ZZ] - trailing space
			{S: [][]jsonic.Tin{{SP}, {CA, LN, ZZ}}, B: 1,
				N: map[string]int{"text": 1},
				G: "csv,end",
				A: func(r *jsonic.Rule, ctx *jsonic.Context) {
					textN := r.N["text"]
					var val string
					if textN == 1 {
						val = ""
					} else if r.Prev != nil && r.Prev != jsonic.NoRule {
						if s, ok := r.Prev.Node.(string); ok {
							val = s
						}
					}
					spaceStr := ""
					if !trim {
						spaceStr = r.O0.Src
					}
					result := val + spaceStr
					r.Node = result
					if textN == 1 {
						// first
					} else if r.Prev != nil && r.Prev != jsonic.NoRule {
						r.Prev.Node = result
					}
				}},

			// SP only
			{S: [][]jsonic.Tin{{SP}},
				N: map[string]int{"text": 1},
				G: "csv,space",
				A: func(r *jsonic.Rule, ctx *jsonic.Context) {
					if strict {
						textN := r.N["text"]
						var val string
						if textN == 1 {
							val = ""
						} else if r.Prev != nil && r.Prev != jsonic.NoRule {
							if s, ok := r.Prev.Node.(string); ok {
								val = s
							}
						}
						spaceStr := ""
						if !trim {
							spaceStr = r.O0.Src
						}
						result := val + spaceStr
						r.Node = result
						if textN == 1 {
							// first
						} else if r.Prev != nil && r.Prev != jsonic.NoRule {
							r.Prev.Node = result
						}
					}
				},
				P: func() string {
					if strict {
						return ""
					}
					return "val"
				}()},

			// Accept anything after text
			{},
		}

		rs.AddBC(func(r *jsonic.Rule, ctx *jsonic.Context) {
			if !jsonic.IsUndefined(r.Child.Node) {
				r.Parent.Node = r.Child.Node
			} else {
				r.Parent.Node = r.Node
			}
		})
	})
}

// tokenStr gets the string value from a token (Val for ST, Src otherwise).
func tokenStr(t *jsonic.Token) string {
	if t == nil || t.IsNoToken() {
		return ""
	}
	if t.Tin == jsonic.TinST {
		if s, ok := t.Val.(string); ok {
			return s
		}
	}
	return t.Src
}

// buildCsvStringMatcher creates a custom string matcher for CSV-style
// double-quote escaping: "a""b" → a"b
func buildCsvStringMatcher(opts *resolved, j *jsonic.Jsonic) jsonic.LexMatcher {
	quoteChar := opts.quote
	return func(lex *jsonic.Lex) *jsonic.Token {
		pnt := lex.Cursor()
		src := lex.Src
		sI := pnt.SI
		srclen := len(src)

		if sI >= srclen {
			return nil
		}

		// Check if we're at a quote character
		if !strings.HasPrefix(src[sI:], quoteChar) {
			return nil
		}

		q := quoteChar
		qLen := len(q)
		rI := pnt.RI
		cI := pnt.CI

		sI += qLen // skip opening quote
		cI += qLen

		var s strings.Builder

		for sI < srclen {
			cI++

			// Check for quote character
			if strings.HasPrefix(src[sI:], q) {
				sI += qLen
				cI += qLen - 1

				// Check for escaped quote (double quote)
				if sI < srclen && strings.HasPrefix(src[sI:], q) {
					s.WriteString(q)
					sI += qLen
					cI += qLen
					continue
				}

				// String finished
				val := s.String()
				ssrc := src[pnt.SI:sI]
				tkn := lex.Token("#ST", jsonic.TinST, val, ssrc)
				pnt.SI = sI
				pnt.RI = rI
				pnt.CI = cI
				return tkn
			}

			ch := src[sI]

			// Check for line characters (newlines in quoted fields)
			cfg := j.Config()
			if cfg.LineChars[rune(ch)] {
				if cfg.RowChars[rune(ch)] {
					rI++
					pnt.RI = rI
				}
				cI = 1
				s.WriteByte(ch)
				sI++
				continue
			}

			// Check for unprintable characters
			if ch < 32 {
				// Bad token
				return nil
			}

			// Body part of string - fast scan
			bI := sI
			qFirst := q[0]
			for sI < srclen && src[sI] >= 32 && src[sI] != qFirst {
				if cfg.LineChars[rune(src[sI])] {
					break
				}
				sI++
				cI++
			}
			cI--
			s.WriteString(src[bI:sI])
		}

		// Unterminated string
		return nil
	}
}

// orderedMap maintains insertion order for JSON serialization comparison.
type orderedMap struct {
	keys []string
	m    map[string]any
}

// Parse parses CSV text with the given options, using the jsonic grammar.
func Parse(src string, opts ...CsvOptions) ([]any, error) {
	var o CsvOptions
	if len(opts) > 0 {
		o = opts[0]
	}

	j := MakeJsonic(o)
	result, err := j.Parse(src)
	if err != nil {
		return nil, err
	}

	if result == nil {
		return []any{}, nil
	}

	if arr, ok := result.([]any); ok {
		return arr, nil
	}

	return []any{}, nil
}

// MakeJsonic creates a jsonic instance configured for CSV parsing.
func MakeJsonic(opts ...CsvOptions) *jsonic.Jsonic {
	var o CsvOptions
	if len(opts) > 0 {
		o = opts[0]
	}

	r := resolve(&o)

	jopts := jsonic.Options{
		Rule: &jsonic.RuleOptions{
			Start: "csv",
		},
		Number: &jsonic.NumberOptions{
			Lex: boolPtr(r.number),
		},
		Value: &jsonic.ValueOptions{
			Lex: boolPtr(r.value),
		},
		Comment: &jsonic.CommentOptions{
			Lex: boolPtr(r.comment),
		},
		Lex: &jsonic.LexOptions{
			EmptyResult: []any{},
		},
	}

	if r.recordSep != "" {
		jopts.Line = &jsonic.LineOptions{
			Chars:    r.recordSep,
			RowChars: r.recordSep,
		}
	}

	j := jsonic.Make(jopts)

	// Convert CsvOptions to map for plugin
	pluginMap := optionsToMap(&o)
	j.Use(Csv, pluginMap)

	return j
}

func boolPtr(b bool) *bool {
	return &b
}

// optionsToMap converts CsvOptions to a map[string]any for the plugin interface.
func optionsToMap(o *CsvOptions) map[string]any {
	m := make(map[string]any)
	if o.Object != nil {
		m["object"] = *o.Object
	}
	if o.Header != nil {
		m["header"] = *o.Header
	}
	if o.Trim != nil {
		m["trim"] = *o.Trim
	}
	if o.Comment != nil {
		m["comment"] = *o.Comment
	}
	if o.Number != nil {
		m["number"] = *o.Number
	}
	if o.Value != nil {
		m["value"] = *o.Value
	}
	if o.Strict != nil {
		m["strict"] = *o.Strict
	}
	if o.Field != nil {
		fm := make(map[string]any)
		if o.Field.Separation != "" {
			fm["separation"] = o.Field.Separation
		}
		if o.Field.NonamePrefix != "" {
			fm["nonameprefix"] = o.Field.NonamePrefix
		}
		fm["empty"] = o.Field.Empty
		if o.Field.Exact {
			fm["exact"] = true
		}
		if o.Field.Names != nil {
			fm["names"] = o.Field.Names
		}
		m["field"] = fm
	}
	if o.Record != nil {
		rm := make(map[string]any)
		if o.Record.Separators != "" {
			rm["separators"] = o.Record.Separators
		}
		if o.Record.Empty {
			rm["empty"] = true
		}
		m["record"] = rm
	}
	if o.String != nil {
		sm := make(map[string]any)
		if o.String.Quote != "" {
			sm["quote"] = o.String.Quote
		}
		if o.String.Csv != nil {
			sm["csv"] = *o.String.Csv
		}
		m["string"] = sm
	}
	if o.Stream != nil {
		m["_stream"] = o.Stream
	}
	return m
}

// mapToOptions converts a map[string]any (plugin options) to CsvOptions.
func mapToOptions(m map[string]any) CsvOptions {
	var o CsvOptions
	if m == nil {
		return o
	}

	if v, ok := m["object"]; ok {
		b := toBool(v)
		o.Object = &b
	}
	if v, ok := m["header"]; ok {
		b := toBool(v)
		o.Header = &b
	}
	if v, ok := m["trim"]; ok {
		b := toBool(v)
		o.Trim = &b
	}
	if v, ok := m["comment"]; ok {
		b := toBool(v)
		o.Comment = &b
	}
	if v, ok := m["number"]; ok {
		b := toBool(v)
		o.Number = &b
	}
	if v, ok := m["value"]; ok {
		b := toBool(v)
		o.Value = &b
	}
	if v, ok := m["strict"]; ok {
		b := toBool(v)
		o.Strict = &b
	}

	if fm, ok := m["field"].(map[string]any); ok {
		o.Field = &FieldOptions{}
		if v, ok := fm["separation"].(string); ok {
			o.Field.Separation = v
		}
		if v, ok := fm["nonameprefix"].(string); ok {
			o.Field.NonamePrefix = v
		}
		if v, ok := fm["empty"].(string); ok {
			o.Field.Empty = v
		}
		if v, ok := fm["exact"].(bool); ok {
			o.Field.Exact = v
		}
		if v, ok := fm["names"].([]any); ok {
			for _, n := range v {
				if s, ok := n.(string); ok {
					o.Field.Names = append(o.Field.Names, s)
				}
			}
		}
		if v, ok := fm["names"].([]string); ok {
			o.Field.Names = v
		}
	}

	if rm, ok := m["record"].(map[string]any); ok {
		o.Record = &RecordOptions{}
		if v, ok := rm["separators"].(string); ok {
			o.Record.Separators = v
		}
		if v, ok := rm["empty"].(bool); ok {
			o.Record.Empty = v
		}
	}

	if sm, ok := m["string"].(map[string]any); ok {
		o.String = &StringOptions{}
		if v, ok := sm["quote"].(string); ok {
			o.String.Quote = v
		}
		if v, ok := sm["csv"].(bool); ok {
			o.String.Csv = &v
		}
	}

	if v, ok := m["_stream"].(StreamFunc); ok {
		o.Stream = v
	}

	return o
}

func toBool(v any) bool {
	switch b := v.(type) {
	case bool:
		return b
	default:
		return false
	}
}
