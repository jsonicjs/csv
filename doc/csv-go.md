# CSV plugin for Jsonic (Go)

A Jsonic syntax plugin that parses CSV text into Go slices of maps
or slices, with support for headers, quoted fields, custom
delimiters, streaming, and strict/non-strict modes.

```go
import (
  jsonic "github.com/jsonicjs/jsonic/go"
  csv "github.com/jsonicjs/csv/go"
)
```

```bash
go get github.com/jsonicjs/csv/go@latest
```


## Tutorials

### Parse a basic CSV file

Create a Jsonic instance, register the `Csv` plugin with its
`Defaults`, and call `Parse` on the source text:

```go
package main

import (
    "fmt"
    jsonic "github.com/jsonicjs/jsonic/go"
    csv "github.com/jsonicjs/csv/go"
)

func main() {
    j := jsonic.Make()
    j.UseDefaults(csv.Csv, csv.Defaults)

    result, _ := j.Parse("name,age\nAlice,30\nBob,25")
    fmt.Println(result)
    // [map[age:30 name:Alice] map[age:25 name:Bob]]
}
```

### Parse CSV without headers

Override the `header` and `object` option keys to return rows as
slices of fields:

```go
j := jsonic.Make()
j.UseDefaults(csv.Csv, csv.Defaults, map[string]any{
    "header": false,
    "object": false,
})

result, _ := j.Parse("a,b,c\n1,2,3")
// [[a b c] [1 2 3]]
```

### Parse CSV with quoted fields

Double-quoted fields handle commas, newlines, and escaped quotes
(RFC 4180-style):

```go
j := jsonic.Make()
j.UseDefaults(csv.Csv, csv.Defaults)

result, _ := j.Parse(`name,bio
Alice,"Likes ""cats"" and dogs"
Bob,"Line1
Line2"`)
// [map[name:Alice bio:Likes "cats" and dogs]
//  map[name:Bob bio:Line1\nLine2]]
```


## How-to guides

Each option override is merged on top of `csv.Defaults` by
`UseDefaults`. Nested groups (`field`, `record`, `string`) are
themselves `map[string]any`.

### Use a custom field delimiter

Set `field.separation` to use a delimiter other than comma:

```go
j := jsonic.Make()
j.UseDefaults(csv.Csv, csv.Defaults, map[string]any{
    "field": map[string]any{"separation": "\t"},
})

result, _ := j.Parse("name\tage\nAlice\t30")
// [map[name:Alice age:30]]
```

### Enable number and value parsing

By default in strict mode, all values are strings. Enable `number`
and `value` to parse numeric and boolean values:

```go
j := jsonic.Make()
j.UseDefaults(csv.Csv, csv.Defaults, map[string]any{
    "number": true,
    "value":  true,
})

result, _ := j.Parse("a,b,c\n1,true,null")
// [map[a:1 b:true c:<nil>]]
```

### Trim whitespace from fields

Enable `trim` to remove leading and trailing whitespace from field
values:

```go
j := jsonic.Make()
j.UseDefaults(csv.Csv, csv.Defaults, map[string]any{"trim": true})

result, _ := j.Parse("a , b \n 1 , 2 ")
// [map[a:1 b:2]]
```

### Stream records as they are parsed

Supply a `stream` callback to receive records one at a time. The
plugin calls it with `"start"`, `"record"`, `"end"`, and `"error"`
events; `Parse` itself returns an empty slice:

```go
var records []any
j := jsonic.Make()
j.UseDefaults(csv.Csv, csv.Defaults, map[string]any{
    "stream": func(what string, record any) {
        if what == "record" {
            records = append(records, record)
        }
    },
})

result, _ := j.Parse("a,b\n1,2\n3,4")
// result: [] (empty, records were streamed)
// records: [map[a:1 b:2] map[a:3 b:4]]
```

### Provide explicit field names

Set `field.names` when the CSV has no header row but you want
map output with named fields:

```go
j := jsonic.Make()
j.UseDefaults(csv.Csv, csv.Defaults, map[string]any{
    "header": false,
    "field":  map[string]any{"names": []string{"x", "y", "z"}},
})

result, _ := j.Parse("1,2,3\n4,5,6")
// [map[x:1 y:2 z:3] map[x:4 y:5 z:6]]
```

### Enforce exact field counts

Set `field.exact` to error when a row has more or fewer fields
than the header:

```go
j := jsonic.Make()
j.UseDefaults(csv.Csv, csv.Defaults, map[string]any{
    "field": map[string]any{"exact": true},
})

_, err := j.Parse("a,b\n1,2,3")
// err: unexpected extra field value
```

### Reuse a configured parser

The Jsonic instance itself is reusable — call `Parse` on it as many
times as you need:

```go
j := jsonic.Make()
j.UseDefaults(csv.Csv, csv.Defaults, map[string]any{"number": true})

r1, _ := j.Parse("a,b\n1,2")
r2, _ := j.Parse("x,y\n3,4")
```

### Enable comment lines

Enable `comment` to skip lines starting with `#`:

```go
j := jsonic.Make()
j.UseDefaults(csv.Csv, csv.Defaults, map[string]any{"comment": true})

result, _ := j.Parse("a,b\n# skip\n1,2")
// [map[a:1 b:2]]
```

### Preserve empty records

Blank lines are skipped by default. Set `record.empty` to preserve
them as empty-field records:

```go
j := jsonic.Make()
j.UseDefaults(csv.Csv, csv.Defaults, map[string]any{
    "record": map[string]any{"empty": true},
})

result, _ := j.Parse("a\n1\n\n2")
// [map[a:1] map[a:] map[a:2]]
```


## Explanation

### Strict vs non-strict mode

In **strict mode** (default), the CSV plugin disables Jsonic's
built-in JSON parsing. All field values are treated as raw strings
unless `number` or `value` options are enabled. This matches the
behaviour of standard CSV parsers.

In **non-strict mode** (`"strict": false`), the plugin preserves
Jsonic's ability to parse JSON values. Fields can contain objects,
arrays, booleans, numbers, and quoted strings using Jsonic syntax.
Non-strict mode enables `trim`, `comment`, and `number` by default.

### How quoted fields work

The plugin registers a custom CSV string matcher that handles the
RFC 4180 double-quote escaping convention:

- A field wrapped in double quotes can contain commas, newlines,
  and quotes.
- A literal quote inside a quoted field is represented as `""`.
- For example: `"a""b"` parses to `a"b`.

### How the Go plugin relates to the grammar file

The plugin shares `csv-grammar.jsonic` with the TypeScript
implementation. The grammar file declares the `csv`, `newline`,
`record`, and `text` rules plus static options (`rule.start`,
`lex.emptyResult`, `error`, `hint`). Dynamic options that depend
on user input (tokens, IGNORE set, line separators, number/value
lexing, etc.) are applied in code after `j.Grammar(...)` so their
`TokenSet` override survives Grammar's internal `SetOptions`.


## Reference

### `Csv` (Plugin function)

```go
func Csv(j *jsonic.Jsonic, options map[string]any) error
```

The Jsonic plugin that installs CSV grammar and options. Register
with `j.UseDefaults(csv.Csv, csv.Defaults, overrides...)`.

### `Defaults` (map)

```go
var Defaults map[string]any
```

The default option set for the plugin. Pass it to `UseDefaults`
so user-supplied overrides are merged on top of the defaults.

### `Version` (string)

The module version string.

### Option keys

Top-level keys (set on the options map passed to `UseDefaults`):

| Key       | Type             | Default | Notes                                              |
|-----------|------------------|---------|----------------------------------------------------|
| `trim`    | `bool` or `nil`  | `nil`   | `nil` → `false` strict / `true` non-strict         |
| `comment` | `bool` or `nil`  | `nil`   | `nil` → `false` strict / `true` non-strict         |
| `number`  | `bool` or `nil`  | `nil`   | `nil` → `false` strict / `true` non-strict         |
| `value`   | `bool` or `nil`  | `nil`   | Parse `true`/`false`/`null` literals                |
| `header`  | `bool`           | `true`  | Treat first row as field names                     |
| `object`  | `bool`           | `true`  | Emit maps (`true`) or slices (`false`)             |
| `strict`  | `bool`           | `true`  | Disable Jsonic syntax inside fields                |
| `stream`  | `func(string, any)` | `nil` | Streaming callback (see below)                    |

Nested `field` group:

| Key                  | Type       | Default    | Notes                                  |
|----------------------|------------|------------|----------------------------------------|
| `field.separation`   | `string`   | `nil`      | Delimiter; `nil` uses `,`              |
| `field.nonameprefix` | `string`   | `"field~"` | Prefix for unnamed extra fields        |
| `field.empty`        | `any`      | `""`       | Value substituted for empty fields     |
| `field.names`        | `[]string` | `nil`      | Explicit names (overrides header row)  |
| `field.exact`        | `bool`     | `false`    | Error on field count mismatch          |

Nested `record` group:

| Key                 | Type      | Default | Notes                                  |
|---------------------|-----------|---------|----------------------------------------|
| `record.separators` | `string`  | `nil`   | Custom record-separator characters     |
| `record.empty`      | `bool`    | `false` | Preserve empty lines as records        |

Nested `string` group:

| Key            | Type            | Default | Notes                                 |
|----------------|-----------------|---------|---------------------------------------|
| `string.quote` | `string`        | `"`     | Quote character for CSV string mode   |
| `string.csv`   | `bool` or `nil` | `nil`   | Force CSV string matcher; `nil`=auto  |

### Streaming callback

```go
func(what string, record any)
```

`what` is one of `"start"`, `"record"`, `"end"`, or `"error"`.
For `"record"`, `record` holds the parsed row (map or slice
according to `object`). For `"error"`, `record` holds the error
value.
