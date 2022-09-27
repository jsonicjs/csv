"use strict";
/* Copyright (c) 2021-2022 Richard Rodger and other contributors, MIT License */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = __importDefault(require("util"));
const jsonic_next_1 = require("@jsonic/jsonic-next");
const csv_1 = require("../csv");
const Spectrum = require('csv-spectrum');
const Fixtures = require('./csv-fixtures');
describe('csv', () => {
    test('double-quote', async () => {
        const j = jsonic_next_1.Jsonic.make().use(csv_1.Csv);
        expect(j('a\n"b"')).toEqual([{ a: 'b' }]);
        expect(j('a\n"""b"')).toEqual([{ a: '"b' }]);
        expect(j('a\n"b"""')).toEqual([{ a: 'b"' }]);
        expect(j('a\n"""b"""')).toEqual([{ a: '"b"' }]);
        expect(j('a\n"b""c"')).toEqual([{ a: 'b"c' }]);
        expect(j('a\n"b""c""d"')).toEqual([{ a: 'b"c"d' }]);
        expect(j('a\n"b""c""d""e"')).toEqual([{ a: 'b"c"d"e' }]);
        expect(j('a\n"""b"')).toEqual([{ a: '"b' }]);
        expect(j('a\n"b"""')).toEqual([{ a: 'b"' }]);
        expect(j('a\n"""b"""')).toEqual([{ a: '"b"' }]);
        expect(j('a\n"""""b"')).toEqual([{ a: '""b' }]);
        expect(j('a\n"b"""""')).toEqual([{ a: 'b""' }]);
        expect(j('a\n"""""b"""""')).toEqual([{ a: '""b""' }]);
    });
    test('trim', async () => {
        const j = jsonic_next_1.Jsonic.make().use(csv_1.Csv);
        expect(j('a\n b')).toEqual([{ a: ' b' }]);
        expect(j('a\nb ')).toEqual([{ a: 'b ' }]);
        expect(j('a\n b ')).toEqual([{ a: ' b ' }]);
        expect(j('a\n  b   ')).toEqual([{ a: '  b   ' }]);
        expect(j('a\n \tb \t ')).toEqual([{ a: ' \tb \t ' }]);
        expect(j('a\n b c')).toEqual([{ a: ' b c' }]);
        expect(j('a\nb c ')).toEqual([{ a: 'b c ' }]);
        expect(j('a\n b c ')).toEqual([{ a: ' b c ' }]);
        expect(j('a\n  b c   ')).toEqual([{ a: '  b c   ' }]);
        expect(j('a\n \tb c \t ')).toEqual([{ a: ' \tb c \t ' }]);
        const jt = jsonic_next_1.Jsonic.make().use(csv_1.Csv, { trim: true });
        expect(jt('a\n b')).toEqual([{ a: 'b' }]);
        expect(jt('a\nb ')).toEqual([{ a: 'b' }]);
        expect(jt('a\n b ')).toEqual([{ a: 'b' }]);
        expect(jt('a\n  b   ')).toEqual([{ a: 'b' }]);
        expect(jt('a\n \tb \t ')).toEqual([{ a: 'b' }]);
        expect(jt('a\n b c')).toEqual([{ a: 'b c' }]);
        expect(jt('a\nb c ')).toEqual([{ a: 'b c' }]);
        expect(jt('a\n b c ')).toEqual([{ a: 'b c' }]);
        expect(jt('a\n  b c   ')).toEqual([{ a: 'b c' }]);
        expect(jt('a\n \tb c \t ')).toEqual([{ a: 'b c' }]);
    });
    test('comment', async () => {
        const j = jsonic_next_1.Jsonic.make().use(csv_1.Csv);
        expect(j('a\n# b')).toEqual([{ a: '# b' }]);
        expect(j('a\n b #c')).toEqual([{ a: ' b #c' }]);
        const jc = jsonic_next_1.Jsonic.make().use(csv_1.Csv, { comment: true });
        expect(jc('a\n# b')).toEqual([]);
        expect(jc('a\n b #c')).toEqual([{ a: ' b ' }]);
        const jt = jsonic_next_1.Jsonic.make().use(csv_1.Csv, { strict: false });
        expect(jt('a\n# b')).toEqual([]);
        expect(jt('a\n b ')).toEqual([{ a: 'b' }]);
    });
    test('number', async () => {
        const j = jsonic_next_1.Jsonic.make().use(csv_1.Csv);
        expect(j('a\n1')).toEqual([{ a: '1' }]);
        expect(j('a\n1e2')).toEqual([{ a: '1e2' }]);
        const jn = jsonic_next_1.Jsonic.make().use(csv_1.Csv, { number: true });
        expect(jn('a\n1')).toEqual([{ a: 1 }]);
        expect(jn('a\n1e2')).toEqual([{ a: 100 }]);
        const jt = jsonic_next_1.Jsonic.make().use(csv_1.Csv, { strict: false });
        expect(jt('a\n1')).toEqual([{ a: 1 }]);
        expect(jt('a\n1e2')).toEqual([{ a: 100 }]);
    });
    test('stream', (fin) => {
        let tmp = {};
        let data;
        const j = jsonic_next_1.Jsonic.make().use(csv_1.Csv, {
            stream: (what, record) => {
                if ('start' === what) {
                    data = [];
                    tmp.start = Date.now();
                }
                else if ('record' === what) {
                    data.push(record);
                }
                else if ('end' === what) {
                    tmp.end = Date.now();
                    expect(data).toEqual([
                        { a: '1', b: '2' },
                        { a: '3', b: '4' },
                        { a: '5', b: '6' },
                    ]);
                    expect(tmp.start <= tmp.end).toBeTruthy();
                    fin();
                }
            }
        });
        j('a,b\n1,2\n3,4\n5,6');
    });
    test('unstrict', async () => {
        const j = jsonic_next_1.Jsonic.make().use(csv_1.Csv, { strict: false });
        let d0 = j(`a,b,c
true,[1,2],{x:{y:"q\\"w"}}
`);
        expect(d0).toEqual([
            {
                a: true,
                b: [
                    1,
                    2,
                ],
                c: {
                    x: {
                        y: 'q"w',
                    },
                },
            },
        ]);
    });
    test('spectrum', async () => {
        const j = jsonic_next_1.Jsonic.make().use(csv_1.Csv);
        const tests = await util_1.default.promisify(Spectrum)();
        for (let i = 0; i < tests.length; i++) {
            let test = tests[i];
            let name = test.name;
            let json = JSON.parse(test.json.toString());
            let csv = test.csv.toString();
            let res = j(csv);
            let testname = name + ' ' + (i + 1) + '/' + tests.length;
            expect({ [testname]: res }).toEqual({ [testname]: json });
        }
    });
    test('fixtures', async () => {
        const csv = jsonic_next_1.Jsonic.make().use(csv_1.Csv);
        Object.entries(Fixtures).map((fixture) => {
            let name = fixture[0];
            let spec = fixture[1];
            try {
                let parser = csv;
                if (spec.opt) {
                    parser = jsonic_next_1.Jsonic.make().use(csv_1.Csv, spec.opt);
                }
                let raw = null != spec.rawref ? Fixtures[spec.rawref].raw : spec.raw;
                let out = parser(raw);
                expect(out).toEqual(spec.out);
            }
            catch (e) {
                if (spec.err) {
                    expect(spec.err).toEqual(e.code);
                }
                else {
                    console.error('FIXTURE: ' + name);
                    throw e;
                }
            }
        });
    });
});
//# sourceMappingURL=csv.test.js.map