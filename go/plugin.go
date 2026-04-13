package csv

import (
	"strconv"
	"strings"

	jsonic "github.com/jsonicjs/jsonic/go"
)

// --- BEGIN EMBEDDED csv-grammar.jsonic ---
const grammarText = `
# CSV Grammar Definition
# Parsed by a standard Jsonic instance and passed to jsonic.grammar()
# Function references (@ prefixed) are resolved against the refs map
#
# Token naming:
#   #LN - line ending (non-ignored; TS modifies IGNORE set, Go overrides LN token set)
#   #SP - whitespace  (non-ignored; TS modifies IGNORE set, Go overrides SP token set)
#   #CA - comma / field separator
#   #ZZ - end of input
#   #VAL - token set: text, string, number, value literals
#
# Rules csv, newline, record, text are fully defined here.
# Rules list, elem, val are modified in code (strict mode defines from scratch;
# non-strict prepends to existing defaults to preserve JSON parsing).

{
  rule: csv: open: [
    { s: '#ZZ' }
    { s: '#LN' p: newline c: '@not-record-empty' }
    { p: record }
  ]

  rule: newline: open: [
    { s: '#LN #LN' r: newline }
    { s: '#LN' r: newline }
    { s: '#ZZ' }
    { r: record }
  ]
  rule: newline: close: [
    { s: '#LN #LN' r: newline }
    { s: '#LN' r: newline }
    { s: '#ZZ' }
    { r: record }
  ]

  rule: record: open: [
    { p: list }
  ]
  rule: record: close: [
    { s: '#ZZ' }
    { s: '#LN #ZZ' b: 1 }
    { s: '#LN' r: '@record-close-next' }
  ]

  rule: text: open: [
    { s: ['#VAL' '#SP'] b: 1 r: text n: { text: 1 } g: 'csv,space,follows' a: '@text-follows' }
    { s: ['#SP' '#VAL'] r: text n: { text: 1 } g: 'csv,space,leads' a: '@text-leads' }
    { s: ['#SP' '#CA #LN #ZZ'] b: 1 n: { text: 1 } g: 'csv,end' a: '@text-end' }
    { s: '#SP' n: { text: 1 } g: 'csv,space' a: '@text-space' p: '@text-space-push' }
    {}
  ]
}
`
// --- END EMBEDDED csv-grammar.jsonic ---

// Csv is a jsonic plugin that adds CSV parsing support.
// It mirrors the TypeScript Csv plugin, using a shared grammar definition
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

		if useCsvString {
			cfg.StringLex = false
			for ch := range cfg.StringChars {
				delete(cfg.StringChars, ch)
			}
		}

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
		delete(cfg.FixedTokens, ",")
		j.Token("#CA", opts.fieldSep)
		cfg.SortFixedTokens()
	}

	cfg := j.Config()

	// Configure number/value/comment lexing
	cfg.NumberLex = optNumber
	cfg.ValueLex = optValue
	cfg.CommentLex = comment

	if !comment {
		cfg.CommentLine = nil
		cfg.CommentBlock = nil
	}

	cfg.RuleStart = "csv"

	if opts.recordSep != "" {
		cfg.LineChars = make(map[rune]bool)
		cfg.RowChars = make(map[rune]bool)
		for _, ch := range opts.recordSep {
			cfg.LineChars[ch] = true
			cfg.RowChars[ch] = true
		}
	}

	// Register custom non-ignored token Tins for line and space.
	// In Go, TinSetIGNORE is global and cannot be modified per-instance,
	// so we use custom Tins that are NOT in the ignore set.
	// Override the "LN" and "SP" token sets so that #LN and #SP in the
	// shared grammar resolve to these custom Tins (matching the TS approach
	// where the IGNORE set is modified per-instance).
	lineTin := j.Token("#RL") // custom Tin, not in TinSetIGNORE
	spaceTin := j.Token("#RS") // custom Tin, not in TinSetIGNORE
	j.SetTokenSet("LN", []jsonic.Tin{lineTin})
	j.SetTokenSet("SP", []jsonic.Tin{spaceTin})

	// Intercept the line matcher: emit non-ignored line tokens.
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
		tkn := lex.Token("#LN", lineTin, nil, src[startI:sI])
		pnt.SI = sI
		pnt.RI = rI
		pnt.CI = 1
		return &jsonic.LexCheckResult{Done: true, Token: tkn}
	}

	// Intercept the space matcher: emit non-ignored space tokens.
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
		tkn := lex.Token("#SP", spaceTin, nil, src[startI:sI])
		pnt.SI = sI
		pnt.CI = cI
		return &jsonic.LexCheckResult{Done: true, Token: tkn}
	}

	// Parse the grammar text using a fresh jsonic instance.
	// The grammar uses #LN and #SP which resolve to the custom non-ignored
	// Tins via the overridden token sets above.
	parser := jsonic.Make()
	parsed, err := parser.Parse(grammarText)
	if err != nil {
		panic("failed to parse csv grammar: " + err.Error())
	}
	parsedMap, ok := parsed.(map[string]any)
	if !ok {
		panic("csv grammar did not parse to a map")
	}

	// Build refs map.
	refs := buildRefs(opts, strict, objres, header, trim, recordEmpty, stream)

	// Convert parsed grammar to GrammarSpec and apply.
	gs := mapToGrammarSpec(parsedMap, refs)
	if err := j.Grammar(gs); err != nil {
		panic("failed to apply csv grammar: " + err.Error())
	}

	// Token Tins for the code-based rule definitions below.
	LN := lineTin
	CA := j.Token("#CA")
	SP := spaceTin
	ZZ := j.Token("#ZZ")
	VAL := j.TokenSet("VAL")

	// Rules list, elem, val are defined in code (not grammar) because
	// in non-strict mode the default jsonic alternatives must be preserved.
	// In Go, these are always defined from scratch (strict mode is default).

	// ======= list rule =======
	j.Rule("list", func(rs *jsonic.RuleSpec) {
		rs.Clear()
		rs.AddBO(func(r *jsonic.Rule, ctx *jsonic.Context) {
			r.Node = make([]any, 0)
		})
		rs.Open = []*jsonic.AltSpec{
			{S: [][]jsonic.Tin{{LN}}, B: 1},
			{P: "elem"},
		}
		rs.Close = []*jsonic.AltSpec{
			{S: [][]jsonic.Tin{{LN}}, B: 1},
			{S: [][]jsonic.Tin{{ZZ}}},
		}
	})

	// ======= elem rule =======
	j.Rule("elem", func(rs *jsonic.RuleSpec) {
		rs.Clear()

		rs.Open = []*jsonic.AltSpec{
			{S: [][]jsonic.Tin{{CA}}, B: 1,
				A: jsonic.AltAction(func(r *jsonic.Rule, ctx *jsonic.Context) {
					if arr, ok := r.Node.([]any); ok {
						r.Node = append(arr, opts.emptyField)
						if r.Parent != jsonic.NoRule && r.Parent != nil {
							r.Parent.Node = r.Node
						}
					}
					r.U["done"] = true
				})},
			{P: "val"},
		}

		rs.Close = []*jsonic.AltSpec{
			{S: [][]jsonic.Tin{{CA}, {LN, ZZ}}, B: 1,
				A: jsonic.AltAction(func(r *jsonic.Rule, ctx *jsonic.Context) {
					if arr, ok := r.Node.([]any); ok {
						r.Node = append(arr, opts.emptyField)
						if r.Parent != jsonic.NoRule && r.Parent != nil {
							r.Parent.Node = r.Node
						}
					}
				})},
			{S: [][]jsonic.Tin{{CA}}, R: "elem"},
			{S: [][]jsonic.Tin{{LN}}, B: 1},
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
			{S: [][]jsonic.Tin{VAL, {SP}}, B: 2, P: "text"},
			{S: [][]jsonic.Tin{{SP}}, B: 1, P: "text"},
			{S: [][]jsonic.Tin{VAL}},
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
}

// buildRefs creates the refs map for the grammar.
func buildRefs(
	opts *resolved,
	strict, objres, header bool,
	trim, recordEmpty bool,
	stream StreamFunc,
) map[jsonic.FuncRef]any {
	refs := map[jsonic.FuncRef]any{

		// === State actions (auto-wired by @rulename-{bo,ao,bc,ac}) ===

		"@csv-bo": jsonic.StateAction(func(r *jsonic.Rule, ctx *jsonic.Context) {
			if ctx.Meta == nil {
				ctx.Meta = make(map[string]any)
			}
			ctx.Meta["recordI"] = 0
			if stream != nil {
				stream("start", nil)
			}
			r.Node = make([]any, 0)
		}),

		"@csv-ac": jsonic.StateAction(func(r *jsonic.Rule, ctx *jsonic.Context) {
			if stream != nil {
				stream("end", nil)
			}
		}),

		"@record-bc": jsonic.StateAction(func(r *jsonic.Rule, ctx *jsonic.Context) {
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

			if recordI == 0 && header {
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
				var rawRecord []any
				if childArr, ok := r.Child.Node.([]any); ok {
					rawRecord = childArr
				} else {
					rawRecord = []any{}
				}

				if opts.fieldExact && fieldSlice != nil {
					if len(rawRecord) != len(fieldSlice) {
						errCode := "csv_missing_field"
						if len(rawRecord) > len(fieldSlice) {
							errCode = "csv_extra_field"
						}
						errTkn := &jsonic.Token{
							Name: "#BD",
							Tin:  jsonic.TinBD,
							Why:  errCode,
							Src:  errCode,
						}
						ctx.ParseErr = errTkn
						return
					}
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
							if r.Parent != jsonic.NoRule && r.Parent != nil {
								r.Parent.Node = r.Node
							}
						}
					}
				} else {
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
		}),

		"@text-bc": jsonic.StateAction(func(r *jsonic.Rule, ctx *jsonic.Context) {
			if !jsonic.IsUndefined(r.Child.Node) {
				r.Parent.Node = r.Child.Node
			} else {
				r.Parent.Node = r.Node
			}
		}),

		// === Alt actions ===

		"@elem-open-empty": jsonic.AltAction(func(r *jsonic.Rule, ctx *jsonic.Context) {
			if arr, ok := r.Node.([]any); ok {
				r.Node = append(arr, opts.emptyField)
				if r.Parent != jsonic.NoRule && r.Parent != nil {
					r.Parent.Node = r.Node
				}
			}
			r.U["done"] = true
		}),

		"@elem-close-trailing": jsonic.AltAction(func(r *jsonic.Rule, ctx *jsonic.Context) {
			if arr, ok := r.Node.([]any); ok {
				r.Node = append(arr, opts.emptyField)
				if r.Parent != jsonic.NoRule && r.Parent != nil {
					r.Parent.Node = r.Node
				}
			}
		}),

		"@text-follows": jsonic.AltAction(func(r *jsonic.Rule, ctx *jsonic.Context) {
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
		}),

		"@text-leads": jsonic.AltAction(func(r *jsonic.Rule, ctx *jsonic.Context) {
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
		}),

		"@text-end": jsonic.AltAction(func(r *jsonic.Rule, ctx *jsonic.Context) {
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
		}),

		"@text-space": jsonic.AltAction(func(r *jsonic.Rule, ctx *jsonic.Context) {
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
		}),

		// === Conditions ===

		"@not-record-empty": jsonic.AltCond(func(r *jsonic.Rule, ctx *jsonic.Context) bool {
			return !recordEmpty
		}),

		// === FuncRef for dynamic rule names ===

		"@record-close-next": func(r *jsonic.Rule, ctx *jsonic.Context) string {
			if recordEmpty {
				return "record"
			}
			return "newline"
		},

		"@text-space-push": func(r *jsonic.Rule, ctx *jsonic.Context) string {
			if strict {
				return ""
			}
			return "val"
		},
	}

	return refs
}

// mapToGrammarSpec converts a parsed grammar map to a GrammarSpec.
func mapToGrammarSpec(parsed map[string]any, ref map[jsonic.FuncRef]any) *jsonic.GrammarSpec {
	gs := &jsonic.GrammarSpec{
		Ref: ref,
	}

	ruleMap, _ := parsed["rule"].(map[string]any)
	if ruleMap == nil {
		return gs
	}

	gs.Rule = make(map[string]*jsonic.GrammarRuleSpec, len(ruleMap))
	for name, rDef := range ruleMap {
		rd, ok := rDef.(map[string]any)
		if !ok {
			continue
		}
		grs := &jsonic.GrammarRuleSpec{}
		if openDef, ok := rd["open"]; ok {
			grs.Open = convertAlts(openDef)
		}
		if closeDef, ok := rd["close"]; ok {
			grs.Close = convertAlts(closeDef)
		}
		gs.Rule[name] = grs
	}

	return gs
}

// convertAlts converts a parsed grammar alt definition to []*GrammarAltSpec
// or *GrammarAltListSpec.
func convertAlts(def any) any {
	switch v := def.(type) {
	case []any:
		alts := make([]*jsonic.GrammarAltSpec, 0, len(v))
		for _, a := range v {
			alt := convertAlt(a)
			if alt != nil {
				alts = append(alts, alt)
			}
		}
		return alts
	case map[string]any:
		// May be an AltListSpec with "alts" and "inject"
		als := &jsonic.GrammarAltListSpec{}
		if altsArr, ok := v["alts"].([]any); ok {
			for _, a := range altsArr {
				alt := convertAlt(a)
				if alt != nil {
					als.Alts = append(als.Alts, alt)
				}
			}
		}
		if inj, ok := v["inject"].(map[string]any); ok {
			als.Inject = &jsonic.GrammarInjectSpec{}
			if app, ok := inj["append"].(bool); ok {
				als.Inject.Append = app
			}
		}
		return als
	}
	return nil
}

// convertAlt converts a single parsed alt map to a GrammarAltSpec.
func convertAlt(def any) *jsonic.GrammarAltSpec {
	m, ok := def.(map[string]any)
	if !ok {
		// Empty alt spec {}
		return &jsonic.GrammarAltSpec{}
	}

	ga := &jsonic.GrammarAltSpec{}

	if s, ok := m["s"]; ok {
		switch sv := s.(type) {
		case string:
			ga.S = sv
		case []any:
			strs := make([]string, len(sv))
			for i, item := range sv {
				strs[i], _ = item.(string)
			}
			ga.S = strs
		}
	}

	if b, ok := m["b"]; ok {
		switch bv := b.(type) {
		case float64:
			ga.B = int(bv)
		case int:
			ga.B = bv
		case string:
			ga.B = bv
		}
	}

	if p, ok := m["p"].(string); ok {
		ga.P = p
	}

	if r, ok := m["r"].(string); ok {
		ga.R = r
	}

	if a, ok := m["a"].(string); ok {
		ga.A = a
	}

	if e, ok := m["e"].(string); ok {
		ga.E = e
	}

	if c, ok := m["c"]; ok {
		switch cv := c.(type) {
		case string:
			ga.C = cv
		case map[string]any:
			ga.C = cv
		}
	}

	if n, ok := m["n"].(map[string]any); ok {
		ga.N = make(map[string]int, len(n))
		for k, v := range n {
			switch nv := v.(type) {
			case float64:
				ga.N[k] = int(nv)
			case int:
				ga.N[k] = nv
			}
		}
	}

	if g, ok := m["g"].(string); ok {
		ga.G = g
	}

	if u, ok := m["u"].(map[string]any); ok {
		ga.U = u
	}

	return ga
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
	cfg := j.Config()
	return func(lex *jsonic.Lex, rule *jsonic.Rule) *jsonic.Token {
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

		// Only match when quote is at the start of a field
		if sI > 0 {
			prev := rune(src[sI-1])
			_, isFixed := cfg.FixedTokens[string(prev)]
			if !isFixed && !cfg.LineChars[prev] && !cfg.SpaceChars[prev] {
				return nil
			}
		}

		q := quoteChar
		qLen := len(q)
		rI := pnt.RI
		cI := pnt.CI

		sI += qLen
		cI += qLen

		var s strings.Builder

		for sI < srclen {
			cI++

			if strings.HasPrefix(src[sI:], q) {
				sI += qLen
				cI += qLen - 1

				if sI < srclen && strings.HasPrefix(src[sI:], q) {
					s.WriteString(q)
					sI += qLen
					cI += qLen
					continue
				}

				val := s.String()
				ssrc := src[pnt.SI:sI]
				tkn := lex.Token("#ST", jsonic.TinST, val, ssrc)
				pnt.SI = sI
				pnt.RI = rI
				pnt.CI = cI
				return tkn
			}

			ch := src[sI]

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

			if ch < 32 {
				return nil
			}

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

		badSrc := src[pnt.SI:sI]
		tkn := lex.Token("#BD", jsonic.TinBD, nil, badSrc)
		tkn.Why = "unterminated_string"
		pnt.SI = sI
		pnt.RI = rI
		pnt.CI = cI
		return tkn
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

	pluginMap := optionsToMap(&o)
	j.Use(Csv, pluginMap)

	return j
}

func boolPtr(b bool) *bool {
	return &b
}
