package csv

// CsvOptions configures the CSV parser.
type CsvOptions struct {
	Object  *bool          // Return objects (default true) or arrays
	Header  *bool          // First row is header (default true)
	Trim    *bool          // Trim whitespace from values
	Comment *bool          // Enable # comments
	Number  *bool          // Parse numeric values
	Value   *bool          // Parse true/false/null
	Strict  *bool          // Strict CSV mode (default true)
	Field   *FieldOptions  // Field options
	Record  *RecordOptions // Record options
	String  *StringOptions // String options
	Stream  StreamFunc     // Streaming callback
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

// StringOptions configures string handling.
type StringOptions struct {
	Quote string // Quote character (default `"`)
	Csv   *bool  // Force CSV string mode
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
	quote        string
	csvString    *bool
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
		quote:        `"`,
	}

	// In non-strict mode, trim/comment/number/value default to true
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

	if o.String != nil {
		if o.String.Quote != "" {
			r.quote = o.String.Quote
		}
		r.csvString = o.String.Csv
	}

	r.stream = o.Stream
	return r
}
