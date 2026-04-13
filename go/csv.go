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
