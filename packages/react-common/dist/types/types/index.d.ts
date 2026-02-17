/// <reference types="react" />
export type StateSetter<T> = React.Dispatch<React.SetStateAction<T>>;
declare module 'axios' {
    interface AxiosRequestConfig {
        query?: Record<string, string | number | boolean | undefined | null>;
    }
}
//# sourceMappingURL=index.d.ts.map