export declare const isUndefined: (val: unknown) => val is undefined;
export declare const isNull: (val: unknown) => val is null;
export declare const defined: <T>(arg: T) => arg is Exclude<T, null>;
export declare const isNil: (val: unknown) => val is null;
export declare const isString: (val: unknown) => val is string;
export declare const hasLength: <T extends {
    length: number;
}>(val: T) => boolean;
export declare const isStringFull: (val: unknown) => val is string;
export declare const isArray: <T>(val: T) => val is T extends (infer V)[] ? V[] : any[];
export declare const isArrayFull: <T>(val: T) => val is T extends (infer V)[] ? V[] : any[];
export declare const isArrayStrings: (val: unknown) => val is string[];
export declare const isObject: (val: unknown) => val is object;
export declare const isObjectFull: (val: unknown) => val is object;
export declare const isNumber: (val: unknown) => val is number;
export declare const isBoolean: (val: unknown) => val is boolean;
export declare const isNumeric: (val: string) => boolean;
export declare const isDateString: (val: string) => boolean;
export declare const isDate: (val: unknown) => val is Date;
export declare const isValue: (val: unknown) => val is string | number | boolean | Date;
export declare const hasValue: (val: unknown) => boolean;
export declare const isFunction: <T>(val: T) => val is T extends Function ? T : Function;
export declare const checkPassword: RegExp;
export declare const isValidEmail: RegExp;
export declare const preventInvalidChars: (e: React.KeyboardEvent<HTMLDivElement>, array: string[]) => void;
//# sourceMappingURL=index.d.ts.map