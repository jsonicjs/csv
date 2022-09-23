import { Plugin, Config, Options, Lex } from '@jsonic/jsonic-next';
declare type CsvOptions = {
    strict: boolean;
};
declare const Csv: Plugin;
declare function makeCsvStringMatcher(cfg: Config, _opts: Options): (lex: Lex) => import("@jsonic/jsonic-next").Token | undefined;
export { Csv, makeCsvStringMatcher, };
export type { CsvOptions };
