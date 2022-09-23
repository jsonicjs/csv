"use strict";
/* Copyright (c) 2021-2022 Richard Rodger, MIT License */
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeCsvStringMatcher = exports.Csv = void 0;
// TODO: strict needs own stringMatcher for csv style strings
const jsonic_next_1 = require("@jsonic/jsonic-next");
const { deep, charset, omap, keys, clean } = jsonic_next_1.util;
const Csv = (jsonic, options) => {
    jsonic.lex(makeCsvStringMatcher);
    const strict = !!options.strict;
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
    let jsonicOptions = {
        rule: {
            start: 'csv',
        },
        fixed: {
            token
        },
        tokenSet: {
            ignore: strict ? [null, null, null] : [],
        },
        // space: {
        //   // lex: !strict,
        // },
        number: {
            lex: !strict,
        },
        value: {
            lex: !strict,
        },
        // string: {
        //   escapedouble: true,
        // },
        // token: token,
        error: {
            csv_unexpected_field: 'unexpected field value: $fsrc'
        },
        hint: {
            csv_unexpected_field: `Row $row has too many fields (the first of which is: $fsrc). Only $len
fields per row are expected.`,
        },
    };
    jsonic.options(jsonicOptions);
    let { LN, TX, SP, ZZ } = jsonic.token;
    jsonic.rule('csv', (rs) => {
        rs
            .open({ p: 'record' })
            .bo((rule) => {
            rule.node = [];
        });
        return rs;
    });
    jsonic.rule('elem', (rs) => {
        rs.close({ s: [LN], b: 1 }, { append: false }); // End list and record
        return rs;
    });
    jsonic.rule('record', (rs) => {
        rs.
            open([
            { s: [LN], r: 'record' },
            { p: 'list' },
        ])
            .close([
            { s: [ZZ] },
            { s: [LN, ZZ] },
            { s: [LN], r: 'record' }
        ])
            .bc((rule, ctx) => {
            let fields = ctx.use.fields;
            // First line is fields
            if (null == fields) {
                fields = ctx.use.fields = rule.child.node;
            }
            else {
                let list = rule.child.node;
                let record = {};
                for (let i = 0; i < list.length; i++) {
                    let field_name = fields[i];
                    record[field_name] = list[i];
                }
                rule.node.push(record);
            }
        });
        return rs;
    });
    jsonic.rule('val', (rs) => {
        return rs
            .open({ s: [SP], b: 1, p: 'text' }, { append: false })
            .open({ s: [TX, SP], b: 2, p: 'text' }, { append: false });
    });
    jsonic.rule('text', (rs) => {
        return rs
            .open([
            {
                // NOTE: r in open means no close except final
                s: [TX, SP], b: 1, r: 'text', n: { text: 1 },
                a: (r) => {
                    let v = (1 === r.n.text ? r : r.prev);
                    r.node = v.node = (1 === r.n.text ? '' : r.prev.node) + r.o0.src;
                    console.log('TEXT AA', v.node);
                }
            },
            {
                s: [SP, TX], r: 'text', n: { text: 1 },
                a: (r) => {
                    let v = (1 === r.n.text ? r : r.prev);
                    r.node = v.node = (1 === r.n.text ? '' : r.prev.node) +
                        (2 <= r.n.text ? r.o0.src : '') +
                        r.o1.src;
                    console.log('TEXT BB', v.node);
                }
            },
            { s: [SP] },
            {},
        ]);
    });
};
exports.Csv = Csv;
function makeCsvStringMatcher(cfg, _opts) {
    return function csvStringMatcher(lex) {
        let quoteMap = { '"': true };
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
                // console.log(100, sI, c, s)
                // Quote char.
                if (q === c) {
                    sI++;
                    cI++;
                    if (q === src[sI]) {
                        s.push(q);
                        // console.log(300, sI, src[sI], s)
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
                        // console.log(800, sI, s)
                    }
                }
            }
            if (src[sI - 1] !== q || pnt.sI === sI - 1) {
                pnt.rI = qrI;
                return lex.bad('unterminated_string', qI, sI);
            }
            const tkn = lex.token('#ST', s.join(jsonic_next_1.EMPTY), src.substring(pnt.sI, sI), pnt);
            // console.log('TKN', tkn)
            pnt.sI = sI;
            pnt.rI = rI;
            pnt.cI = cI;
            return tkn;
        }
    };
}
exports.makeCsvStringMatcher = makeCsvStringMatcher;
Csv.defaults = {
    strict: true,
};
//# sourceMappingURL=csv.js.map