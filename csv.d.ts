import { Plugin, Config, Options, Lex } from '@jsonic/jsonic-next';
declare type CsvOptions = {
    trim: boolean | null;
    comment: boolean | null;
    number: boolean | null;
    header: boolean;
    object: boolean;
    stream: null | ((what: string, record?: Record<string, any> | Error) => void);
    strict: boolean;
    field: {
        nonameprefix: string;
        empty: any;
    };
};
declare const Csv: Plugin;
declare function makeCsvStringMatcher(cfg: Config, _opts: Options): (lex: Lex) => import("@jsonic/jsonic-next").Token | undefined;
export { Csv, makeCsvStringMatcher, };
export type { CsvOptions };
