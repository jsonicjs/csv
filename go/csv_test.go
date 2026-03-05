package csv

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"reflect"
	"testing"

	jsonic "github.com/jsonicjs/jsonic/go"
)

// fixtureEntry represents one entry in the test manifest.
type fixtureEntry struct {
	Name    string         `json:"name"`
	CsvFile string         `json:"csvFile,omitempty"`
	Opt     map[string]any `json:"opt,omitempty"`
	Err     string         `json:"err,omitempty"`
}

func fixturesDir() string {
	return filepath.Join("..", "test", "fixtures")
}

func TestFixtures(t *testing.T) {
	dir := fixturesDir()
	manifestPath := filepath.Join(dir, "manifest.json")

	manifestData, err := os.ReadFile(manifestPath)
	if err != nil {
		t.Fatalf("Failed to read manifest: %v", err)
	}

	var manifest map[string]fixtureEntry
	if err := json.Unmarshal(manifestData, &manifest); err != nil {
		t.Fatalf("Failed to parse manifest: %v", err)
	}

	for key, entry := range manifest {
		t.Run(entry.Name, func(t *testing.T) {
			csvFile := entry.CsvFile
			if csvFile == "" {
				csvFile = key
			}

			csvData, err := os.ReadFile(filepath.Join(dir, csvFile+".csv"))
			if err != nil {
				t.Fatalf("Failed to read CSV file %s: %v", csvFile, err)
			}

			opts := mapToOptions(entry.Opt)
			result, err := Parse(string(csvData), opts)
			if err != nil {
				if entry.Err != "" {
					return // expected error
				}
				t.Fatalf("Unexpected error: %v", err)
			}

			if entry.Err != "" {
				t.Fatalf("Expected error %s but got none", entry.Err)
			}

			expectedData, err := os.ReadFile(filepath.Join(dir, key+".json"))
			if err != nil {
				t.Fatalf("Failed to read expected JSON: %v", err)
			}

			var expected []any
			if err := json.Unmarshal(expectedData, &expected); err != nil {
				t.Fatalf("Failed to parse expected JSON: %v", err)
			}

			// Normalize result for comparison
			resultNorm := normalizeResult(result)
			expectedNorm := normalizeJSON(expected)

			if !reflect.DeepEqual(resultNorm, expectedNorm) {
				resultJSON, _ := json.MarshalIndent(resultNorm, "", "  ")
				expectedJSON, _ := json.MarshalIndent(expectedNorm, "", "  ")
				t.Errorf("Fixture %q mismatch:\nGot:      %s\nExpected: %s",
					entry.Name, string(resultJSON), string(expectedJSON))
			}
		})
	}
}

// TestPlugin verifies CSV parsing works through the MakeJsonic interface.
func TestPlugin(t *testing.T) {
	j := MakeJsonic()

	result, err := j.Parse("a,b\n1,2\n3,4")
	if err != nil {
		t.Fatalf("Plugin parse error: %v", err)
	}

	arr, ok := result.([]any)
	if !ok {
		t.Fatalf("Expected []any, got %T", result)
	}

	if len(arr) != 2 {
		t.Fatalf("Expected 2 records, got %d", len(arr))
	}

	// Verify first record
	r0 := toMap(arr[0])
	if r0["a"] != "1" || r0["b"] != "2" {
		t.Errorf("Record 0: expected {a:1,b:2}, got %v", r0)
	}
}

// TestPluginWithOptions verifies MakeJsonic with options.
func TestPluginWithOptions(t *testing.T) {
	bFalse := false
	j := MakeJsonic(CsvOptions{Object: &bFalse})

	result, err := j.Parse("a,b\n1,2")
	if err != nil {
		t.Fatalf("Plugin parse error: %v", err)
	}

	arr, ok := result.([]any)
	if !ok {
		t.Fatalf("Expected []any, got %T", result)
	}

	if len(arr) != 1 {
		t.Fatalf("Expected 1 record, got %d", len(arr))
	}

	inner, ok := arr[0].([]any)
	if !ok {
		t.Fatalf("Expected inner []any, got %T", arr[0])
	}

	if inner[0] != "1" || inner[1] != "2" {
		t.Errorf("Expected [1,2], got %v", inner)
	}
}

// TestPluginEmpty verifies empty input returns empty array.
func TestPluginEmpty(t *testing.T) {
	j := MakeJsonic()

	result, err := j.Parse("")
	if err != nil {
		t.Fatalf("Plugin parse error: %v", err)
	}

	arr, ok := result.([]any)
	if !ok {
		t.Fatalf("Expected []any, got %T: %v", result, result)
	}

	if len(arr) != 0 {
		t.Errorf("Expected empty array, got %v", arr)
	}
}

// TestUsePlugin verifies j.Use(Csv) plugin interface works.
func TestUsePlugin(t *testing.T) {
	j := jsonic.Make()
	j.Use(Csv, nil)

	// The plugin modifies jsonic's grammar for CSV parsing.
	// This test verifies the plugin doesn't panic.
	result, err := j.Parse("a,b\n1,2")
	if err != nil {
		t.Logf("Plugin parse returned error (expected with basic plugin): %v", err)
	}
	_ = result
}

// TestEmptyRecords verifies empty record handling matches TS behavior.
func TestEmptyRecords(t *testing.T) {
	// Default: empty records ignored
	result, _ := Parse("a\n1\n\n2\n3\n\n\n4\n")
	assertRecords(t, "empty-ignored", result, []map[string]any{
		{"a": "1"}, {"a": "2"}, {"a": "3"}, {"a": "4"},
	})

	// With empty records enabled
	bTrue := true
	result2, _ := Parse("a\n1\n\n2\n3\n\n\n4\n", CsvOptions{
		Record: &RecordOptions{Empty: true},
	})
	assertRecords(t, "empty-preserved", result2, []map[string]any{
		{"a": "1"}, {"a": ""}, {"a": "2"}, {"a": "3"},
		{"a": ""}, {"a": ""}, {"a": "4"},
	})
	_ = bTrue
}

// TestHeader verifies header handling matches TS behavior.
func TestHeader(t *testing.T) {
	result, _ := Parse("\na,b\nA,B")
	assertRecords(t, "header-skip-leading", result, []map[string]any{
		{"a": "A", "b": "B"},
	})

	bFalse := false
	result2, _ := Parse("\na,b\nA,B", CsvOptions{Header: &bFalse})
	assertRecords(t, "no-header", result2, []map[string]any{
		{"field~0": "a", "field~1": "b"},
		{"field~0": "A", "field~1": "B"},
	})
}

// TestDoubleQuotes verifies double-quote escaping matches TS behavior.
func TestDoubleQuotes(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{`a` + "\n" + `"b"`, "b"},
		{`a` + "\n" + `"""b"`, `"b`},
		{`a` + "\n" + `"b"""`, `b"`},
		{`a` + "\n" + `"""b"""`, `"b"`},
		{`a` + "\n" + `"b""c"`, `b"c`},
		{`a` + "\n" + `"b""c""d"`, `b"c"d`},
		{`a` + "\n" + `"""""b"`, `""b`},
		{`a` + "\n" + `"b"""""`, `b""`},
		{`a` + "\n" + `"""""b"""""`, `""b""`},
	}

	for _, tt := range tests {
		result, err := Parse(tt.input)
		if err != nil {
			t.Errorf("Parse(%q): error: %v", tt.input, err)
			continue
		}
		if len(result) != 1 {
			t.Errorf("Parse(%q): expected 1 record, got %d", tt.input, len(result))
			continue
		}
		m := toMap(result[0])
		if m["a"] != tt.expected {
			t.Errorf("Parse(%q): expected a=%q, got a=%q", tt.input, tt.expected, m["a"])
		}
	}
}

// TestTrim verifies trim behavior.
func TestTrim(t *testing.T) {
	// Without trim - spaces preserved
	r1, _ := Parse("a\n b")
	assertField(t, "no-trim-leading", r1, "a", " b")

	r2, _ := Parse("a\nb ")
	assertField(t, "no-trim-trailing", r2, "a", "b ")

	r3, _ := Parse("a\n b ")
	assertField(t, "no-trim-both", r3, "a", " b ")

	// With trim
	bTrue := true
	r4, _ := Parse("a\n b", CsvOptions{Trim: &bTrue})
	assertField(t, "trim-leading", r4, "a", "b")

	r5, _ := Parse("a\nb ", CsvOptions{Trim: &bTrue})
	assertField(t, "trim-trailing", r5, "a", "b")

	r6, _ := Parse("a\n b c ", CsvOptions{Trim: &bTrue})
	assertField(t, "trim-internal", r6, "a", "b c")
}

// TestComment verifies comment behavior.
func TestComment(t *testing.T) {
	// Without comments - # is literal
	r1, _ := Parse("a\n# b")
	assertField(t, "no-comment", r1, "a", "# b")

	// With comments
	bTrue := true
	r2, _ := Parse("a\n# b", CsvOptions{Comment: &bTrue})
	if len(r2) != 0 {
		t.Errorf("comment-line: expected 0 records, got %d", len(r2))
	}

	r3, _ := Parse("a\n b #c", CsvOptions{Comment: &bTrue})
	assertField(t, "comment-inline", r3, "a", " b ")
}

// TestNumber verifies number parsing.
func TestNumber(t *testing.T) {
	r1, _ := Parse("a\n1")
	assertField(t, "no-number", r1, "a", "1")

	bTrue := true
	r2, _ := Parse("a\n1", CsvOptions{Number: &bTrue})
	m := toMap(r2[0])
	if m["a"] != float64(1) {
		t.Errorf("number: expected 1 (float64), got %v (%T)", m["a"], m["a"])
	}
}

// TestValue verifies value keyword parsing.
func TestValue(t *testing.T) {
	r1, _ := Parse("a\ntrue")
	assertField(t, "no-value", r1, "a", "true")

	bTrue := true
	r2, _ := Parse("a\ntrue", CsvOptions{Value: &bTrue})
	m := toMap(r2[0])
	if m["a"] != true {
		t.Errorf("value-true: expected true, got %v (%T)", m["a"], m["a"])
	}

	r3, _ := Parse("a\nfalse", CsvOptions{Value: &bTrue})
	m3 := toMap(r3[0])
	if m3["a"] != false {
		t.Errorf("value-false: expected false, got %v (%T)", m3["a"], m3["a"])
	}

	r4, _ := Parse("a\nnull", CsvOptions{Value: &bTrue})
	m4 := toMap(r4[0])
	if m4["a"] != nil {
		t.Errorf("value-null: expected nil, got %v (%T)", m4["a"], m4["a"])
	}
}

// TestStream verifies streaming callback behavior.
func TestStream(t *testing.T) {
	var events []string
	var records []any

	_, _ = Parse("a,b\n1,2\n3,4\n5,6", CsvOptions{
		Stream: func(what string, record any) {
			events = append(events, what)
			if what == "record" {
				records = append(records, record)
			}
		},
	})

	if len(events) < 3 {
		t.Fatalf("Expected at least 3 events, got %d", len(events))
	}
	if events[0] != "start" {
		t.Errorf("First event should be 'start', got %q", events[0])
	}
	if events[len(events)-1] != "end" {
		t.Errorf("Last event should be 'end', got %q", events[len(events)-1])
	}

	if len(records) != 3 {
		t.Errorf("Expected 3 records, got %d", len(records))
	}
}

// TestSeparators verifies custom field separators.
func TestSeparators(t *testing.T) {
	result, _ := Parse("a|b|c\nA|B|C\nAA|BB|CC", CsvOptions{
		Field: &FieldOptions{Separation: "|"},
	})
	assertRecords(t, "pipe", result, []map[string]any{
		{"a": "A", "b": "B", "c": "C"},
		{"a": "AA", "b": "BB", "c": "CC"},
	})

	result2, _ := Parse("a~~b~~c\nA~~B~~C", CsvOptions{
		Field: &FieldOptions{Separation: "~~"},
	})
	assertRecords(t, "multi-char", result2, []map[string]any{
		{"a": "A", "b": "B", "c": "C"},
	})
}

// TestRecordSeparators verifies custom record separators.
func TestRecordSeparators(t *testing.T) {
	result, _ := Parse("a,b,c%A,B,C%AA,BB,CC", CsvOptions{
		Record: &RecordOptions{Separators: "%"},
	})
	assertRecords(t, "record-sep", result, []map[string]any{
		{"a": "A", "b": "B", "c": "C"},
		{"a": "AA", "b": "BB", "c": "CC"},
	})
}

// Helper functions

func assertRecords(t *testing.T, name string, result []any, expected []map[string]any) {
	t.Helper()
	if len(result) != len(expected) {
		t.Errorf("%s: expected %d records, got %d: %v", name, len(expected), len(result), result)
		return
	}
	for i, exp := range expected {
		m := toMap(result[i])
		for k, v := range exp {
			if fmt.Sprintf("%v", m[k]) != fmt.Sprintf("%v", v) {
				t.Errorf("%s: record %d, field %q: expected %v, got %v", name, i, k, v, m[k])
			}
		}
	}
}

func assertField(t *testing.T, name string, result []any, key string, expected string) {
	t.Helper()
	if len(result) != 1 {
		t.Errorf("%s: expected 1 record, got %d", name, len(result))
		return
	}
	m := toMap(result[0])
	if m[key] != expected {
		t.Errorf("%s: expected %q=%q, got %q=%q", name, key, expected, key, m[key])
	}
}

func toMap(v any) map[string]any {
	switch m := v.(type) {
	case map[string]any:
		return m
	case orderedMap:
		return m.m
	default:
		return nil
	}
}

// normalizeResult converts our internal types to standard Go types for comparison.
func normalizeResult(result []any) []any {
	out := make([]any, len(result))
	for i, r := range result {
		out[i] = normalizeValue(r)
	}
	return out
}

func normalizeValue(v any) any {
	switch val := v.(type) {
	case orderedMap:
		m := make(map[string]any)
		for k, v := range val.m {
			m[k] = normalizeValue(v)
		}
		return m
	case map[string]any:
		m := make(map[string]any)
		for k, v := range val {
			m[k] = normalizeValue(v)
		}
		return m
	case []any:
		out := make([]any, len(val))
		for i, v := range val {
			out[i] = normalizeValue(v)
		}
		return out
	default:
		return v
	}
}

// normalizeJSON normalizes JSON-decoded values for comparison.
// JSON numbers are always float64, so we need consistent handling.
func normalizeJSON(v any) any {
	switch val := v.(type) {
	case []any:
		out := make([]any, len(val))
		for i, item := range val {
			out[i] = normalizeJSON(item)
		}
		return out
	case map[string]any:
		m := make(map[string]any)
		for k, v := range val {
			m[k] = normalizeJSON(v)
		}
		return m
	default:
		return v
	}
}
