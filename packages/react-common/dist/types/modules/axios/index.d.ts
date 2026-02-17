import { AxiosRequestConfig } from 'axios';
export interface InterceptorRequestHandlerModel {
    onFulfilled: (value: AxiosRequestConfig) => AxiosRequestConfig;
    onRejected?: (error: any) => any;
}
interface AxiosConfigsModel {
    apiBaseURL: string;
    apiTimeout?: number;
    customConfigHeaders?: object;
    interceptorRequestHandler?: InterceptorRequestHandlerModel;
    getLang?: () => string;
    getToken?: () => string;
}
export declare const createAxiosInstance: ({ apiBaseURL, apiTimeout, customConfigHeaders, interceptorRequestHandler, getLang, getToken, }: AxiosConfigsModel) => import("axios").AxiosInstance;
export {};
//# sourceMappingURL=index.d.ts.map