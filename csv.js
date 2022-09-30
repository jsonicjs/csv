"use strict";
/* Copyright (c) 2021-2022 Richard Rodger, MIT License */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCsvStringMatcher = exports.Csv = void 0;
// NOTE: Good example of use case for `r` control in open rule.
// TODO: other delimiters, tab etc
const jsonic_next_1 = require("@jsonic/jsonic-next");
const Csv = (jsonic, options) => {
    var _a;
    const strict = !!options.strict;
    const objres = !!options.object;
    const header = !!options.header;
    const stream = options.stream;
    let trim = !!options.trim;
    let comment = !!options.comment;
    let opt_number = !!options.number;
    let opt_value = !!options.value;
    let record_empty = !!((_a = options.record) === null || _a === void 0 ? void 0 : _a.empty);
    if (strict) {
        if (false !== options.string.csv) {
            jsonic.lex(buildCsvStringMatcher(options));
        }
        jsonic.options({
            rule: { exclude: 'jsonic,imp' },
        });
    }
    else {
        if (true === options.string.csv) {
            jsonic.lex(buildCsvStringMatcher(options));
        }
        trim = null === options.trim ? true : trim;
        comment = null === options.comment ? true : comment;
        opt_number = null === options.number ? true : opt_number;
        opt_value = null === options.value ? true : opt_value;
        jsonic.options({
            rule: { exclude: 'imp' },
        });
    }
    if (stream) {
        let parser = jsonic.internal().parser;
        let origStart = parser.start.bind(parser);
        parser.start = (...args) => {
            try {
                return origStart(...args);
            }
            catch (e) {
                stream('error', e);
            }
        };
    }
    let token = {};
    if (strict) {
        // Disable JSON structure tokens
        token = {
            '#OB': null,
            '#CB': null,
            '#OS': null,
            '#CS': null,
            '#CL': null,
        };
    }
    if (options.field.separation) {
        token['#CA'] = options.field.separation;
    }
    let VAL = jsonic.internal().config.tokenSet.val;
    let jsonicOptions = {
        rule: {
            start: 'csv',
        },
        fixed: {
            token
        },
        tokenSet: {
            // ignore: strict ? [null, null, comment ? undefined : null] : [null, null],
            // See jsonic/src/defaults.ts; and util.deep merging
            ignore: [
                strict ? null : undefined,
                null,
                undefined, // Still ignore #CM comments
            ]
        },
        number: {
            lex: opt_number,
        },
        value: {
            lex: opt_value,
        },
        comment: {
            lex: comment,
        },
        lex: {
            emptyResult: [],
        },
        line: {
            single: record_empty,
            chars: null == options.record.separators ? undefined : options.record.separators,
            rowChars: null == options.record.separators ? undefined : options.record.separators,
        },
        error: {
            csv_extra_field: 'unexpected extra field value: $fsrc',
            csv_missing_field: 'missing field'
        },
        hint: {
            csv_extra_field: `Row $row has too many fields (the first of which is: $fsrc). Only $len
fields per row are expected.`,
            csv_missing_field: `Row $row has too few fields. $len fields per row are expected.`,
        },
    };
    jsonic.options(jsonicOptions);
    let { LN, CA, SP, ZZ } = jsonic.token;
    jsonic.rule('csv', (rs) => {
        rs
            .bo((r, ctx) => {
            ctx.use.recordI = 0;
            stream && stream('start');
            r.node = [];
        })
            .open([
            { s: [ZZ] },
            !record_empty && { s: [LN], r: 'newline' },
            { p: 'record' }
        ])
            .ac(() => { (stream && stream('end')); });
        return rs;
    });
    jsonic.rule('newline', (rs) => {
        rs
            .open([
            { s: [LN, LN], r: 'newline' },
            { s: [LN], r: 'newline' },
            { s: [ZZ] },
            { r: 'record' },
        ])
            .close([
            { s: [LN, LN], r: 'newline' },
            { s: [LN], r: 'newline' },
            { s: [ZZ] },
            { r: 'record' },
        ]);
    });
    jsonic.rule('record', (rs) => {
        rs
            .open([
            // {
            //   s: [LN, ZZ],
            // },
            // {
            //   s: [LN],
            //   b: 1,
            //   c: (r: Rule, ctx: Context) =>
            //     0 === ctx.use.recordI && null == r.o0.ignored,
            // },
            // {
            //   s: [LN],
            //   r: 'record'
            // },
            // { s: [LN] },
            { p: 'list' },
        ])
            .close([
            { s: [ZZ] },
            { s: [LN, ZZ] },
            { s: [LN], r: record_empty ? 'record' : 'newline' },
        ])
            .bc((rule, ctx) => {
            // if (ZZ === rule.o1.tin) return;
            let fields = ctx.use.fields || options.field.names;
            // First line is fields
            if (0 === ctx.use.recordI && header) {
                fields = ctx.use.fields =
                    undefined === rule.child.node ? [] : rule.child.node;
            }
            else {
                let record = rule.child.node || [];
                if (objres) {
                    let obj = {};
                    let i = 0;
                    if (fields) {
                        if (options.field.exact) {
                            if (record.length !== fields.length) {
                                return ctx.t0.bad(record.length > fields.length ?
                                    'csv_extra_field' : 'csv_missing_field');
                            }
                        }
                        let fI = 0;
                        for (; fI < fields.length; fI++) {
                            obj[fields[fI]] = undefined === record[fI] ?
                                options.field.empty : record[fI];
                        }
                        i = fI;
                    }
                    for (; i < record.length; i++) {
                        let field_name = options.field.nonameprefix + i;
                        obj[field_name] = undefined === record[i] ?
                            options.field.empty : record[i];
                    }
                    record = obj;
                }
                else {
                    for (let i = 0; i < record.length; i++) {
                        record[i] = undefined === record[i] ? options.field.empty : record[i];
                    }
                }
                if (stream) {
                    stream('record', record);
                }
                else {
                    rule.node.push(record);
                }
            }
            ctx.use.recordI++;
        });
        return rs;
    });
    jsonic.rule('list', (rs) => {
        return rs
            .open([{ s: [LN], b: 1 }]);
    });
    jsonic.rule('elem', (rs) => {
        return rs
            .open([
            { s: [CA], b: 1, a: (r) => r.node.push(options.field.empty) },
        ], { append: false })
            .close([
            { s: [CA, LN], b: 1, a: (r) => r.node.push(options.field.empty) },
            { s: [LN], b: 1 },
        ], { append: false });
    });
    jsonic.rule('val', (rs) => {
        return rs
            .open([
            { s: [VAL, SP], b: 2, p: 'text' },
            { s: [SP], b: 1, p: 'text' },
            { s: [LN], b: 1 },
        ], { append: false });
    });
    jsonic.rule('text', (rs) => {
        return rs
            // Space within non-space is preserved as part of text value.
            .open([
            {
                // NOTE: r in open means no close except final
                // s: [TX, SP], b: 1, r: 'text', n: { text: 1 },
                s: [VAL, SP], b: 1, r: 'text', n: { text: 1 },
                g: 'csv,space,follows',
                a: (r) => {
                    // Keep appending to prev node
                    let v = (1 === r.n.text ? r : r.prev);
                    r.node = v.node = (1 === r.n.text ? '' : r.prev.node) + r.o0.val;
                }
            },
            {
                // s: [SP, TX], r: 'text', n: { text: 1 },
                s: [SP, VAL], r: 'text', n: { text: 1 },
                g: 'csv,space,leads',
                a: (r) => {
                    let v = (1 === r.n.text ? r : r.prev);
                    r.node = v.node = (1 === r.n.text ? '' : r.prev.node) +
                        (2 <= r.n.text || !trim ? r.o0.src : '') +
                        r.o1.src;
                }
            },
            {
                s: [SP, [CA, LN, ZZ]], b: 1, n: { text: 1 },
                g: 'csv,end',
                a: (r) => {
                    let v = (1 === r.n.text ? r : r.prev);
                    r.node = v.node = (1 === r.n.text ? '' : r.prev.node) +
                        (!trim ? r.o0.src : '');
                },
            },
            {
                s: [SP], n: { text: 1 },
                g: 'csv,space',
                a: (r) => {
                    if (strict) {
                        let v = (1 === r.n.text ? r : r.prev);
                        r.node = v.node = (1 === r.n.text ? '' : r.prev.node) +
                            (!trim ? r.o0.src : '');
                    }
                },
                p: strict ? undefined : 'val'
            },
            // Accept anything after text.
            {},
        ])
            // Close is called on final rule - set parent val node
            .bc((r) => {
            r.parent.node = undefined === r.child.node ? r.node : r.child.node;
        });
    });
};
exports.Csv = Csv;
function buildCsvStringMatcher(csvopts) {
    return function makeCsvStringMatcher(cfg, _opts) {
        return function csvStringMatcher(lex) {
            let quoteMap = { [csvopts.string.quote]: true };
            let { pnt, src } = lex;
            let { sI, rI, cI } = pnt;
            let srclen = src.length;
            if (quoteMap[src[sI]]) {
                const q = src[sI]; // Quote character
                const qI = sI;
                const qrI = rI;
                ++sI;
                ++cI;
                let s = [];
                // let rs: string | undefined
                for (sI; sI < srclen; sI++) {
                    cI++;
                    let c = src[sI];
                    // Quote char.
                    if (q === c) {
                        sI++;
                        cI++;
                        if (q === src[sI]) {
                            s.push(q);
                        }
                        else {
                            break; // String finished.
                        }
                    }
                    // Body part of string.
                    else {
                        let bI = sI;
                        // TODO: move to cfgx
                        let qc = q.charCodeAt(0);
                        let cc = src.charCodeAt(sI);
                        while (sI < srclen &&
                            32 <= cc &&
                            qc !== cc) {
                            cc = src.charCodeAt(++sI);
                            cI++;
                        }
                        cI--;
                        if (cfg.line.chars[src[sI]]) {
                            if (cfg.line.rowChars[src[sI]]) {
                                pnt.rI = ++rI;
                            }
                            cI = 1;
                            s.push(src.substring(bI, sI + 1));
                        }
                        else if (cc < 32) {
                            pnt.sI = sI;
                            pnt.cI = cI;
                            return lex.bad('unprintable', sI, sI + 1);
                        }
                        else {
                            s.push(src.substring(bI, sI));
                            sI--;
                        }
                    }
                }
                if (src[sI - 1] !== q || pnt.sI === sI - 1) {
                    pnt.rI = qrI;
                    return lex.bad('unterminated_string', qI, sI);
                }
                const tkn = lex.token('#ST', s.join(jsonic_next_1.EMPTY), src.substring(pnt.sI, sI), pnt);
                pnt.sI = sI;
                pnt.rI = rI;
                pnt.cI = cI;
                return tkn;
            }
        };
    };
}
exports.buildCsvStringMatcher = buildCsvStringMatcher;
Csv.defaults = {
    // Trim surrounding space. Default: false (!strict=>true)
    trim: null,
    // Support comments. Default: false (!strict=>true)
    comment: null,
    // Support numbers. Default: false (!strict=>true)
    number: null,
    // Support exact values (such as booleans). Default: false (!strict=>true)
    value: null,
    // First row is headers.
    header: true,
    // Records are returned as objects. If false, as arrays.
    object: true,
    // Stream records.
    stream: null,
    // Parse standard CSV, ignoring embedded JSON. Default: false.
    // When true, changes some defaults, e.g. trim=>true 
    strict: true,
    // Control field handling
    field: {
        // Separator string
        separation: null,
        // Create numbered names for extra fields found in a record.
        nonameprefix: 'field~',
        // Value to insert for empty fields.
        empty: '',
        // Predefined field names (string[]).
        names: undefined,
        // Require each row to have an exact number of fields (same number as headers).
        exact: false,
    },
    // Control record handling.
    record: {
        // Separator characters (not string!)
        separators: null,
        // Allow empty lines to generate records.
        empty: false
    },
    string: {
        quote: '"',
        csv: null,
    }
};
//# sourceMappingURL=csv.js.map