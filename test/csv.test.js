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
describe('csv', () => {
    test('double-quote', async () => {
        const j = jsonic_next_1.Jsonic.make().use(csv_1.Csv);
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
            if (3 === i) {
                console.log(json);
                console.log(csv);
            }
            expect({ [testname]: res }).toEqual({ [testname]: json });
        }
    });
});
//# sourceMappingURL=csv.test.js.map