package csv

import (
	jsonic "github.com/jsonicjs/jsonic/go"
)

// Csv is a jsonic plugin that adds CSV parsing support.
// It adds a high-priority custom matcher that consumes the entire source
// and produces the CSV-parsed result as a single value token.
//
// Usage:
//
//	j := jsonic.Make()
//	j.Use(Csv, map[string]any{"header": true})
//	result, err := j.Parse("a,b\n1,2")
func Csv(j *jsonic.Jsonic, pluginOpts map[string]any) {
	csvOpts := mapToOptions(pluginOpts)

	// Add a high-priority matcher that consumes the entire source
	// and produces a single value token containing the parsed CSV result.
	j.AddMatcher("csv", 1000, func(lex *jsonic.Lex) *jsonic.Token {
		pnt := lex.Cursor()
		if pnt.SI != 0 {
			return nil // Only match at start of source
		}

		src := lex.Src
		result, err := Parse(src, csvOpts)
		if err != nil {
			return nil
		}

		// Convert result to []any for jsonic
		out := make([]any, len(result))
		for i, r := range result {
			out[i] = normalizeForJsonic(r)
		}

		tkn := lex.Token("#VL", jsonic.TinVL, any(out), src)
		pnt.SI = len(src) // consume entire source
		pnt.CI += len(src)
		return tkn
	})
}

// normalizeForJsonic converts internal types to standard Go types.
func normalizeForJsonic(v any) any {
	switch val := v.(type) {
	case orderedMap:
		m := make(map[string]any)
		for k, v := range val.m {
			m[k] = normalizeForJsonic(v)
		}
		return m
	case []any:
		out := make([]any, len(val))
		for i, v := range val {
			out[i] = normalizeForJsonic(v)
		}
		return out
	default:
		return v
	}
}

// MakeJsonic creates a jsonic instance configured for CSV parsing.
// This is the recommended way to create a CSV-parsing jsonic instance.
//
// Usage:
//
//	j := csv.MakeJsonic(csv.CsvOptions{...})
//	result, err := j.Parse("a,b\n1,2")
func MakeJsonic(opts ...CsvOptions) *jsonic.Jsonic {
	var o CsvOptions
	if len(opts) > 0 {
		o = opts[0]
	}

	j := jsonic.Make(jsonic.Options{
		Parser: &jsonic.ParserOptions{
			Start: func(src string, j *jsonic.Jsonic, meta map[string]any) (any, error) {
				result, err := Parse(src, o)
				if err != nil {
					return nil, err
				}
				out := make([]any, len(result))
				for i, r := range result {
					out[i] = normalizeForJsonic(r)
				}
				return out, nil
			},
		},
		Lex: &jsonic.LexOptions{
			EmptyResult: []any{},
		},
	})

	return j
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
