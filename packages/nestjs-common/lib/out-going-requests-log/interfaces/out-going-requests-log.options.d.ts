import { ModuleMetadata, Provider, Type } from '@nestjs/common';
type Simplify<T> = T extends infer S ? {
    [K in keyof S]: S[K];
} : never;
type NoneOf<T> = Simplify<{
    [K in keyof T]?: never;
}>;
type AtMostOneOf<T> = NoneOf<T> | {
    [K in keyof T]: Simplify<Pick<T, K> & NoneOf<Omit<T, K>>>;
}[keyof T];
export type OutGoingRequestsLogOptions = AtMostOneOf<{
    whiteList: string[];
    blackList: string[];
}> & {
    name?: string;
};
export interface OutGoingRequestsLogOptionsFactory {
    createOutGoingRequestsLogModuleOptions(): Promise<OutGoingRequestsLogOptions> | OutGoingRequestsLogOptions;
}
export interface OutGoingRequestsLogAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    useExisting?: Type<OutGoingRequestsLogOptionsFactory>;
    useClass?: Type<OutGoingRequestsLogOptionsFactory>;
    useFactory?: (...args: any[]) => Promise<OutGoingRequestsLogOptions> | OutGoingRequestsLogOptions;
    inject?: any[];
    extraProviders?: Provider[];
}
export {};
