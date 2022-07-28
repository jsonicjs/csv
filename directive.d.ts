import { StateAction, Plugin } from '@jsonic/jsonic-next';
declare type DirectiveOptions = {
    name: string;
    open: string;
    action: StateAction | string;
    close?: string;
    rules?: string | string[];
};
declare const Directive: Plugin;
export { Directive };
export type { DirectiveOptions };
