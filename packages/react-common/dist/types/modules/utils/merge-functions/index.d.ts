export declare const mergeFunctions: <F extends (...args: any[]) => any>(...funcs: F[]) => (...args: F extends Function ? Parameters<F> : never) => void;
//# sourceMappingURL=index.d.ts.map