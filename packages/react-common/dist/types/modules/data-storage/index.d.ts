export type DataStorage = {
    getItem: (name: string) => string | null;
    setItem: (name: string, value: string) => void;
    removeItem?: (name: string) => void;
};
type DataStorageArgs = {
    key: string;
    getStorage?: () => DataStorage;
};
export declare const dataStorage: <T>(key: DataStorageArgs['key'], getStorage?: DataStorageArgs['getStorage']) => {
    set: (data: T) => void;
    get: () => T;
    remove: () => void;
};
export declare const dataSessionStorage: (key: string) => {
    set: (data: unknown) => void;
    get: () => unknown;
    remove: () => void;
};
export {};
//# sourceMappingURL=index.d.ts.map