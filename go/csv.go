package csv

import (
	"strconv"
	"strings"
	"unicode"
)

// CsvOptions configures the CSV parser.
type CsvOptions struct {
	Object *bool          // Return objects (default true) or arrays
	Header *bool          // First row is header (default true)
	Trim   *bool          // Trim whitespace from values
	Comment *bool         // Enable # comments
	Number *bool          // Parse numeric values
	Value  *bool          // Parse true/false/null
	Strict *bool          // Strict CSV mode (default true)
	Field  *FieldOptions  // Field options
	Record *RecordOptions // Record options
	Stream StreamFunc     // Streaming callback
}

// FieldOptions configures field handling.
type FieldOptions struct {
	Separation   string   // Field separator (default ",")
	NonamePrefix string   // Prefix for unnamed fields (default "field~")
	Empty        string   // Value for empty fields (default "")
	Names        []string // Explicit field names (used when header=false)
	Exact        bool     // Error on field count mismatch
}

// RecordOptions configures record handling.
type RecordOptions struct {
	Separators string // Custom record separator character(s)
	Empty      bool   // Preserve empty records (default false)
}

// StreamFunc is a callback for streaming CSV parsing.
type StreamFunc func(what string, record any)

// resolved options with defaults applied
type resolved struct {
	object       bool
	header       bool
	trim         bool
	comment      bool
	number       bool
	value        bool
	strict       bool
	fieldSep     string
	noNamePrefix string
	emptyField   string
	fieldNames   []string
	fieldExact   bool
	recordSep    string
	recordEmpty  bool
	quote        byte
	stream       StreamFunc
}

func boolOpt(p *bool, def bool) bool {
	if p != nil {
		return *p
	}
	return def
}

func resolve(o *CsvOptions) *resolved {
	strict := boolOpt(o.Strict, true)
	r := &resolved{
		object:       boolOpt(o.Object, true),
		header:       boolOpt(o.Header, true),
		strict:       strict,
		noNamePrefix: "field~",
		emptyField:   "",
		quote:        '"',
	}

	// In non-strict mode, trim/comment/number default to true
	if strict {
		r.trim = boolOpt(o.Trim, false)
		r.comment = boolOpt(o.Comment, false)
		r.number = boolOpt(o.Number, false)
		r.value = boolOpt(o.Value, false)
	} else {
		r.trim = o.Trim == nil || boolOpt(o.Trim, true)
		r.comment = o.Comment == nil || boolOpt(o.Comment, true)
		r.number = o.Number == nil || boolOpt(o.Number, true)
		r.value = boolOpt(o.Value, false)
	}

	r.fieldSep = ","
	if o.Field != nil {
		if o.Field.Separation != "" {
			r.fieldSep = o.Field.Separation
		}
		if o.Field.NonamePrefix != "" {
			r.noNamePrefix = o.Field.NonamePrefix
		}
		r.emptyField = o.Field.Empty
		r.fieldNames = o.Field.Names
		r.fieldExact = o.Field.Exact
	}

	if o.Record != nil {
		r.recordSep = o.Record.Separators
		r.recordEmpty = o.Record.Empty
	}

	r.stream = o.Stream
	return r
}

// Parse parses CSV text with the given options.
func Parse(src string, opts ...CsvOptions) ([]any, error) {
	var o CsvOptions
	if len(opts) > 0 {
		o = opts[0]
	}
	r := resolve(&o)
	return parseCSV(src, r)
}

// parser holds parsing state.
type parser struct {
	src  string
	pos  int
	opts *resolved
}

func parseCSV(src string, opts *resolved) ([]any, error) {
	if opts.stream != nil {
		opts.stream("start", nil)
	}

	p := &parser{src: src, pos: 0, opts: opts}
	var result []any

	// Parse all raw records
	var headers []string
	recordIndex := 0

	for p.pos <= len(p.src) {
		fields, isEOF := p.parseRecord()

		// Check if this is an empty record
		isEmpty := len(fields) == 0 || (len(fields) == 1 && fields[0] == "")

		if isEmpty && !isEOF {
			if recordIndex == 0 {
				// Skip leading empty lines (before header)
				continue
			}
			if !opts.recordEmpty {
				continue
			}
			// With empty records enabled, create a record with empty fields
			if opts.header && headers != nil {
				fields = make([]string, 1)
				fields[0] = ""
			}
		}

		if isEmpty && isEOF {
			break
		}

		if recordIndex == 0 && opts.header {
			// First non-empty record is the header
			headers = fields
			recordIndex++
			continue
		}

		// Build the record
		record := buildRecord(fields, headers, opts, recordIndex)
		if opts.stream != nil {
			opts.stream("record", record)
		} else {
			result = append(result, record)
		}
		recordIndex++

		if isEOF {
			break
		}
	}

	if result == nil {
		result = []any{}
	}

	if opts.stream != nil {
		opts.stream("end", nil)
	}

	return result, nil
}

// parseRecord parses one record from the current position.
// Returns the fields and whether EOF was reached.
func (p *parser) parseRecord() ([]string, bool) {
	if p.pos >= len(p.src) {
		return nil, true
	}

	var fields []string
	isEOF := false

	for {
		field, term := p.parseField()
		fields = append(fields, field)

		switch term {
		case termFieldSep:
			// Continue to next field
			continue
		case termRecordSep:
			return fields, false
		case termEOF:
			isEOF = true
			return fields, isEOF
		}
	}
}

type terminator int

const (
	termFieldSep  terminator = iota
	termRecordSep
	termEOF
)

// parseField parses one field value from the current position.
func (p *parser) parseField() (string, terminator) {
	if p.pos >= len(p.src) {
		return "", termEOF
	}

	// Check if we're at a record separator
	if t := p.atRecordSep(); t > 0 {
		p.pos += t
		return "", termRecordSep
	}

	// Check for quoted field
	if p.src[p.pos] == p.opts.quote {
		return p.parseQuotedField()
	}

	return p.parseUnquotedField()
}

// parseQuotedField parses a quoted field (RFC 4180 style).
func (p *parser) parseQuotedField() (string, terminator) {
	quote := p.opts.quote
	p.pos++ // skip opening quote
	var sb strings.Builder

	for p.pos < len(p.src) {
		ch := p.src[p.pos]
		if ch == quote {
			p.pos++
			// Check for escaped quote (double quote)
			if p.pos < len(p.src) && p.src[p.pos] == quote {
				sb.WriteByte(quote)
				p.pos++
				continue
			}
			// End of quoted field - skip to next separator
			return p.skipToSeparator(sb.String())
		}
		sb.WriteByte(ch)
		p.pos++
	}

	// Unterminated quote - return what we have
	return sb.String(), termEOF
}

// skipToSeparator skips any content after closing quote until the next separator.
func (p *parser) skipToSeparator(val string) (string, terminator) {
	for p.pos < len(p.src) {
		// Check for field separator
		if strings.HasPrefix(p.src[p.pos:], p.opts.fieldSep) {
			p.pos += len(p.opts.fieldSep)
			return val, termFieldSep
		}
		// Check for record separator
		if t := p.atRecordSep(); t > 0 {
			p.pos += t
			return val, termRecordSep
		}
		// Skip any other character (non-standard content after closing quote)
		p.pos++
	}
	return val, termEOF
}

// parseUnquotedField parses an unquoted field value.
func (p *parser) parseUnquotedField() (string, terminator) {
	start := p.pos

	for p.pos < len(p.src) {
		// Check for comment
		if p.opts.comment && p.src[p.pos] == '#' {
			val := p.src[start:p.pos]
			// Skip to end of line (or record separator)
			p.skipToRecordEnd()
			return val, termRecordSep
		}

		// Check for field separator
		if strings.HasPrefix(p.src[p.pos:], p.opts.fieldSep) {
			val := p.src[start:p.pos]
			p.pos += len(p.opts.fieldSep)
			return val, termFieldSep
		}

		// Check for record separator
		if t := p.atRecordSep(); t > 0 {
			val := p.src[start:p.pos]
			p.pos += t
			return val, termRecordSep
		}

		p.pos++
	}

	val := p.src[start:p.pos]
	return val, termEOF
}

// skipToRecordEnd skips to the end of the current record (for comments).
func (p *parser) skipToRecordEnd() {
	for p.pos < len(p.src) {
		if t := p.atRecordSep(); t > 0 {
			p.pos += t
			return
		}
		p.pos++
	}
}

// atRecordSep checks if the current position is at a record separator.
// Returns the number of bytes to skip, or 0 if not at a separator.
func (p *parser) atRecordSep() int {
	if p.pos >= len(p.src) {
		return 0
	}

	if p.opts.recordSep != "" {
		// Custom record separator
		if strings.HasPrefix(p.src[p.pos:], p.opts.recordSep) {
			return len(p.opts.recordSep)
		}
		return 0
	}

	// Default: \r\n or \n or \r
	if p.src[p.pos] == '\r' {
		if p.pos+1 < len(p.src) && p.src[p.pos+1] == '\n' {
			return 2
		}
		return 1
	}
	if p.src[p.pos] == '\n' {
		return 1
	}
	return 0
}

// buildRecord converts raw field strings into the output format.
func buildRecord(fields []string, headers []string, opts *resolved, recordIndex int) any {
	// Apply transformations to field values
	processed := make([]any, len(fields))
	for i, f := range fields {
		processed[i] = transformValue(f, opts)
	}

	if !opts.object {
		return processed
	}

	// Build object
	obj := make(map[string]any)
	// Use ordered keys to maintain insertion order
	var keys []string

	nameSource := headers
	if !opts.header && opts.fieldNames != nil {
		nameSource = opts.fieldNames
	}

	if nameSource != nil {
		for i := 0; i < len(nameSource) && i < len(processed); i++ {
			key := nameSource[i]
			obj[key] = processed[i]
			keys = append(keys, key)
		}
		// Extra fields beyond named ones
		for i := len(nameSource); i < len(processed); i++ {
			key := opts.noNamePrefix + strconv.Itoa(i)
			obj[key] = processed[i]
			keys = append(keys, key)
		}
	} else {
		// No names - use prefix
		for i := 0; i < len(processed); i++ {
			key := opts.noNamePrefix + strconv.Itoa(i)
			obj[key] = processed[i]
			keys = append(keys, key)
		}
	}

	// Fill missing fields with empty value
	if nameSource != nil {
		for i := len(processed); i < len(nameSource); i++ {
			obj[nameSource[i]] = opts.emptyField
		}
	}

	return orderedMap{keys: keys, m: obj}
}

// orderedMap maintains insertion order for JSON serialization comparison.
type orderedMap struct {
	keys []string
	m    map[string]any
}

// transformValue applies trim, number, and value conversions.
func transformValue(s string, opts *resolved) any {
	if opts.trim {
		s = strings.TrimFunc(s, unicode.IsSpace)
	}

	if opts.value {
		switch s {
		case "true":
			return true
		case "false":
			return false
		case "null":
			return nil
		}
	}

	if opts.number {
		if n, ok := parseNumber(s); ok {
			return n
		}
	}

	return s
}

// parseNumber tries to parse a string as a number.
func parseNumber(s string) (float64, bool) {
	if s == "" {
		return 0, false
	}
	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return 0, false
	}
	// Return integer if it's a whole number
	if f == float64(int64(f)) && !strings.Contains(s, ".") {
		return f, true
	}
	return f, true
}
