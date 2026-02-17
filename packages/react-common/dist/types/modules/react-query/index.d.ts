import { InfiniteData, QueryClient, UseInfiniteQueryOptions, UseMutateAsyncFunction, UseMutationOptions, UseQueryOptions } from '@tanstack/react-query';
import { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
export type AxiosRequestConfigWithTypes<TData = any, TQuery extends string = string, TParams = any> = Omit<AxiosRequestConfig, 'data' | 'params' | 'query'> & {
    data?: TData;
    query?: Record<TQuery, string | number | boolean | undefined | null>;
    params?: TParams;
};
export type CreateReactQueryOptions = {
    axiosInstance?: AxiosInstance;
    toast?: false | ((err: AxiosError) => unknown | Promise<unknown>);
    log?: false | ((err: AxiosError) => unknown | Promise<unknown>);
};
type InfiniteQueryOptions<TQueryData = any, TQueryBody = any, TQueryQuery extends string = string, TQueryParams = any> = Omit<UseInfiniteQueryOptions<TQueryData, unknown, TQueryData, TQueryData, [
    AxiosRequestConfigWithTypes<TQueryBody, TQueryQuery, TQueryParams>
]>, 'queryKey' | 'queryFn'>;
export declare const createReactQueryFns: (options?: CreateReactQueryOptions) => {
    createMutation: <TQueryData = any, TQueryBody = any, TQueryQuery extends string = string, TQueryParams = any>(baseConfig?: AxiosRequestConfigWithTypes<TQueryBody, TQueryQuery, TQueryParams>, baseQueryOptions?: UseMutationOptions<TQueryData, unknown, AxiosRequestConfigWithTypes<TQueryBody, TQueryQuery, TQueryParams>, unknown>) => {
        (hookConfig?: AxiosRequestConfigWithTypes<TQueryBody, TQueryQuery, TQueryParams>, hookQueryOptions?: UseMutationOptions<TQueryData, unknown, AxiosRequestConfigWithTypes<TQueryBody, TQueryQuery, TQueryParams>, unknown>): {
            safeMutateAsync: UseMutateAsyncFunction<TQueryData, unknown, AxiosRequestConfigWithTypes<TQueryBody, TQueryQuery, TQueryParams>, unknown>;
            data: undefined;
            error: null;
            isError: false;
            isIdle: true;
            isLoading: false;
            isSuccess: false;
            status: "idle";
            mutate: import("@tanstack/react-query").UseMutateFunction<TQueryData, unknown, AxiosRequestConfigWithTypes<TQueryBody, TQueryQuery, TQueryParams>, unknown>;
            reset: () => void;
            context: unknown;
            failureCount: number;
            failureReason: unknown;
            isPaused: boolean;
            variables: AxiosRequestConfigWithTypes<TQueryBody, TQueryQuery, TQueryParams>;
            mutateAsync: UseMutateAsyncFunction<TQueryData, unknown, AxiosRequestConfigWithTypes<TQueryBody, TQueryQuery, TQueryParams>, unknown>;
        } | {
            safeMutateAsync: UseMutateAsyncFunction<TQueryData, unknown, AxiosRequestConfigWithTypes<TQueryBody, TQueryQuery, TQueryParams>, unknown>;
            data: undefined;
            error: null;
            isError: false;
            isIdle: false;
            isLoading: true;
            isSuccess: false;
            status: "loading";
            mutate: import("@tanstack/react-query").UseMutateFunction<TQueryData, unknown, AxiosRequestConfigWithTypes<TQueryBody, TQueryQuery, TQueryParams>, unknown>;
            reset: () => void;
            context: unknown;
            failureCount: number;
            failureReason: unknown;
            isPaused: boolean;
            variables: AxiosRequestConfigWithTypes<TQueryBody, TQueryQuery, TQueryParams>;
            mutateAsync: UseMutateAsyncFunction<TQueryData, unknown, AxiosRequestConfigWithTypes<TQueryBody, TQueryQuery, TQueryParams>, unknown>;
        } | {
            safeMutateAsync: UseMutateAsyncFunction<TQueryData, unknown, AxiosRequestConfigWithTypes<TQueryBody, TQueryQuery, TQueryParams>, unknown>;
            data: undefined;
            error: unknown;
            isError: true;
            isIdle: false;
            isLoading: false;
            isSuccess: false;
            status: "error";
            mutate: import("@tanstack/react-query").UseMutateFunction<TQueryData, unknown, AxiosRequestConfigWithTypes<TQueryBody, TQueryQuery, TQueryParams>, unknown>;
            reset: () => void;
            context: unknown;
            failureCount: number;
            failureReason: unknown;
            isPaused: boolean;
            variables: AxiosRequestConfigWithTypes<TQueryBody, TQueryQuery, TQueryParams>;
            mutateAsync: UseMutateAsyncFunction<TQueryData, unknown, AxiosRequestConfigWithTypes<TQueryBody, TQueryQuery, TQueryParams>, unknown>;
        } | {
            safeMutateAsync: UseMutateAsyncFunction<TQueryData, unknown, AxiosRequestConfigWithTypes<TQueryBody, TQueryQuery, TQueryParams>, unknown>;
            data: TQueryData;
            error: null;
            isError: false;
            isIdle: false;
            isLoading: false;
            isSuccess: true;
            status: "success";
            mutate: import("@tanstack/react-query").UseMutateFunction<TQueryData, unknown, AxiosRequestConfigWithTypes<TQueryBody, TQueryQuery, TQueryParams>, unknown>;
            reset: () => void;
            context: unknown;
            failureCount: number;
            failureReason: unknown;
            isPaused: boolean;
            variables: AxiosRequestConfigWithTypes<TQueryBody, TQueryQuery, TQueryParams>;
            mutateAsync: UseMutateAsyncFunction<TQueryData, unknown, AxiosRequestConfigWithTypes<TQueryBody, TQueryQuery, TQueryParams>, unknown>;
        };
        request(fnConfig?: AxiosRequestConfigWithTypes<TQueryBody, TQueryQuery, TQueryParams>): Promise<TQueryData>;
        config: AxiosRequestConfigWithTypes<TQueryBody, TQueryQuery, TQueryParams>;
    };
    createQuery: <TQueryData_1 = any, TQueryBody_1 = any, TQueryQuery_1 extends string = string, TQueryParams_1 = any>(baseConfig?: AxiosRequestConfigWithTypes<TQueryBody_1, TQueryQuery_1, TQueryParams_1>, baseQueryOptions?: UseQueryOptions<TQueryData_1, unknown, TQueryData_1, [AxiosRequestConfigWithTypes<TQueryBody_1, TQueryQuery_1, TQueryParams_1>]>) => {
        (hookConfig?: AxiosRequestConfigWithTypes<TQueryBody_1, TQueryQuery_1, TQueryParams_1>, hookQueryOptions?: UseQueryOptions<TQueryData_1, unknown, TQueryData_1, [AxiosRequestConfigWithTypes<TQueryBody_1, TQueryQuery_1, TQueryParams_1>]>): import("@tanstack/react-query").UseQueryResult<TQueryData_1, unknown>;
        request(fnConfig?: AxiosRequestConfigWithTypes<TQueryBody_1, TQueryQuery_1, TQueryParams_1>): Promise<TQueryData_1>;
        config: AxiosRequestConfigWithTypes<TQueryBody_1, TQueryQuery_1, TQueryParams_1>;
        getQueryKey(hookConfig?: AxiosRequestConfigWithTypes<TQueryBody_1, TQueryQuery_1, TQueryParams_1>): {
            url?: string;
            query?: Record<TQueryQuery_1, string | number | boolean>;
            params?: TQueryParams_1;
            data?: TQueryBody_1;
            method?: string;
            baseURL?: string;
            transformRequest?: import("axios").AxiosRequestTransformer | import("axios").AxiosRequestTransformer[];
            transformResponse?: import("axios").AxiosResponseTransformer | import("axios").AxiosResponseTransformer[];
            paramsSerializer?: (params: any) => string;
            timeout?: number;
            timeoutErrorMessage?: string;
            withCredentials?: boolean;
            adapter?: import("axios").AxiosAdapter;
            auth?: import("axios").AxiosBasicCredentials;
            responseType?: import("axios").ResponseType;
            responseEncoding?: string;
            xsrfCookieName?: string;
            xsrfHeaderName?: string;
            onUploadProgress?: (progressEvent: any) => void;
            onDownloadProgress?: (progressEvent: any) => void;
            maxContentLength?: number;
            validateStatus?: (status: number) => boolean;
            maxBodyLength?: number;
            maxRedirects?: number;
            beforeRedirect?: (options: Record<string, any>, responseDetails: {
                headers: Record<string, string>;
            }) => void;
            socketPath?: string;
            httpAgent?: any;
            httpsAgent?: any;
            proxy?: false | import("axios").AxiosProxyConfig;
            cancelToken?: import("axios").CancelToken;
            decompress?: boolean;
            transitional?: import("axios").TransitionalOptions;
            signal?: AbortSignal;
            insecureHTTPParser?: boolean;
            env?: {
                FormData?: new (...args: any[]) => object;
            };
            headers?: import("axios").AxiosRequestHeaders;
        };
        fetchQuery(queryClient: QueryClient, hookConfig?: AxiosRequestConfigWithTypes<TQueryBody_1, TQueryQuery_1, TQueryParams_1>): Promise<any>;
        invalidate(queryClient: QueryClient): void;
        setData(queryClient: QueryClient, hookConfig: AxiosRequestConfigWithTypes<TQueryBody_1, TQueryQuery_1, TQueryParams_1>, updater: any): void;
    };
    createShared: <TQueryData_2 = any, TQueryBody_2 = any, TQueryQuery_2 extends string = string, TQueryParams_2 = any>(baseConfig?: AxiosRequestConfigWithTypes<TQueryBody_2, TQueryQuery_2, TQueryParams_2>, { mutationOptions, queryOptions, }?: {
        mutationOptions?: UseMutationOptions<TQueryData_2, unknown, AxiosRequestConfigWithTypes<TQueryBody_2, TQueryQuery_2, TQueryParams_2>, unknown>;
        queryOptions?: UseQueryOptions<TQueryData_2, unknown, TQueryData_2, [AxiosRequestConfigWithTypes<TQueryBody_2, TQueryQuery_2, TQueryParams_2>]>;
    }) => {
        mutation: {
            (hookConfig?: AxiosRequestConfigWithTypes<TQueryBody_2, TQueryQuery_2, TQueryParams_2>, hookQueryOptions?: UseMutationOptions<TQueryData_2, unknown, AxiosRequestConfigWithTypes<TQueryBody_2, TQueryQuery_2, TQueryParams_2>, unknown>): {
                safeMutateAsync: UseMutateAsyncFunction<TQueryData_2, unknown, AxiosRequestConfigWithTypes<TQueryBody_2, TQueryQuery_2, TQueryParams_2>, unknown>;
                data: undefined;
                error: null;
                isError: false;
                isIdle: true;
                isLoading: false;
                isSuccess: false;
                status: "idle";
                mutate: import("@tanstack/react-query").UseMutateFunction<TQueryData_2, unknown, AxiosRequestConfigWithTypes<TQueryBody_2, TQueryQuery_2, TQueryParams_2>, unknown>;
                reset: () => void;
                context: unknown;
                failureCount: number;
                failureReason: unknown;
                isPaused: boolean;
                variables: AxiosRequestConfigWithTypes<TQueryBody_2, TQueryQuery_2, TQueryParams_2>;
                mutateAsync: UseMutateAsyncFunction<TQueryData_2, unknown, AxiosRequestConfigWithTypes<TQueryBody_2, TQueryQuery_2, TQueryParams_2>, unknown>;
            } | {
                safeMutateAsync: UseMutateAsyncFunction<TQueryData_2, unknown, AxiosRequestConfigWithTypes<TQueryBody_2, TQueryQuery_2, TQueryParams_2>, unknown>;
                data: undefined;
                error: null;
                isError: false;
                isIdle: false;
                isLoading: true;
                isSuccess: false;
                status: "loading";
                mutate: import("@tanstack/react-query").UseMutateFunction<TQueryData_2, unknown, AxiosRequestConfigWithTypes<TQueryBody_2, TQueryQuery_2, TQueryParams_2>, unknown>;
                reset: () => void;
                context: unknown;
                failureCount: number;
                failureReason: unknown;
                isPaused: boolean;
                variables: AxiosRequestConfigWithTypes<TQueryBody_2, TQueryQuery_2, TQueryParams_2>;
                mutateAsync: UseMutateAsyncFunction<TQueryData_2, unknown, AxiosRequestConfigWithTypes<TQueryBody_2, TQueryQuery_2, TQueryParams_2>, unknown>;
            } | {
                safeMutateAsync: UseMutateAsyncFunction<TQueryData_2, unknown, AxiosRequestConfigWithTypes<TQueryBody_2, TQueryQuery_2, TQueryParams_2>, unknown>;
                data: undefined;
                error: unknown;
                isError: true;
                isIdle: false;
                isLoading: false;
                isSuccess: false;
                status: "error";
                mutate: import("@tanstack/react-query").UseMutateFunction<TQueryData_2, unknown, AxiosRequestConfigWithTypes<TQueryBody_2, TQueryQuery_2, TQueryParams_2>, unknown>;
                reset: () => void;
                context: unknown;
                failureCount: number;
                failureReason: unknown;
                isPaused: boolean;
                variables: AxiosRequestConfigWithTypes<TQueryBody_2, TQueryQuery_2, TQueryParams_2>;
                mutateAsync: UseMutateAsyncFunction<TQueryData_2, unknown, AxiosRequestConfigWithTypes<TQueryBody_2, TQueryQuery_2, TQueryParams_2>, unknown>;
            } | {
                safeMutateAsync: UseMutateAsyncFunction<TQueryData_2, unknown, AxiosRequestConfigWithTypes<TQueryBody_2, TQueryQuery_2, TQueryParams_2>, unknown>;
                data: TQueryData_2;
                error: null;
                isError: false;
                isIdle: false;
                isLoading: false;
                isSuccess: true;
                status: "success";
                mutate: import("@tanstack/react-query").UseMutateFunction<TQueryData_2, unknown, AxiosRequestConfigWithTypes<TQueryBody_2, TQueryQuery_2, TQueryParams_2>, unknown>;
                reset: () => void;
                context: unknown;
                failureCount: number;
                failureReason: unknown;
                isPaused: boolean;
                variables: AxiosRequestConfigWithTypes<TQueryBody_2, TQueryQuery_2, TQueryParams_2>;
                mutateAsync: UseMutateAsyncFunction<TQueryData_2, unknown, AxiosRequestConfigWithTypes<TQueryBody_2, TQueryQuery_2, TQueryParams_2>, unknown>;
            };
            request(fnConfig?: AxiosRequestConfigWithTypes<TQueryBody_2, TQueryQuery_2, TQueryParams_2>): Promise<TQueryData_2>;
            config: AxiosRequestConfigWithTypes<TQueryBody_2, TQueryQuery_2, TQueryParams_2>;
        };
        query: {
            (hookConfig?: AxiosRequestConfigWithTypes<TQueryBody_2, TQueryQuery_2, TQueryParams_2>, hookQueryOptions?: UseQueryOptions<TQueryData_2, unknown, TQueryData_2, [AxiosRequestConfigWithTypes<TQueryBody_2, TQueryQuery_2, TQueryParams_2>]>): import("@tanstack/react-query").UseQueryResult<TQueryData_2, unknown>;
            request(fnConfig?: AxiosRequestConfigWithTypes<TQueryBody_2, TQueryQuery_2, TQueryParams_2>): Promise<TQueryData_2>;
            config: AxiosRequestConfigWithTypes<TQueryBody_2, TQueryQuery_2, TQueryParams_2>;
            getQueryKey(hookConfig?: AxiosRequestConfigWithTypes<TQueryBody_2, TQueryQuery_2, TQueryParams_2>): {
                url?: string;
                query?: Record<TQueryQuery_2, string | number | boolean>;
                params?: TQueryParams_2;
                data?: TQueryBody_2;
                method?: string;
                baseURL?: string;
                transformRequest?: import("axios").AxiosRequestTransformer | import("axios").AxiosRequestTransformer[];
                transformResponse?: import("axios").AxiosResponseTransformer | import("axios").AxiosResponseTransformer[];
                paramsSerializer?: (params: any) => string;
                timeout?: number;
                timeoutErrorMessage?: string;
                withCredentials?: boolean;
                adapter?: import("axios").AxiosAdapter;
                auth?: import("axios").AxiosBasicCredentials;
                responseType?: import("axios").ResponseType;
                responseEncoding?: string;
                xsrfCookieName?: string;
                xsrfHeaderName?: string;
                onUploadProgress?: (progressEvent: any) => void;
                onDownloadProgress?: (progressEvent: any) => void;
                maxContentLength?: number;
                validateStatus?: (status: number) => boolean;
                maxBodyLength?: number;
                maxRedirects?: number;
                beforeRedirect?: (options: Record<string, any>, responseDetails: {
                    headers: Record<string, string>;
                }) => void;
                socketPath?: string;
                httpAgent?: any;
                httpsAgent?: any;
                proxy?: false | import("axios").AxiosProxyConfig;
                cancelToken?: import("axios").CancelToken;
                decompress?: boolean;
                transitional?: import("axios").TransitionalOptions;
                signal?: AbortSignal;
                insecureHTTPParser?: boolean;
                env?: {
                    FormData?: new (...args: any[]) => object;
                };
                headers?: import("axios").AxiosRequestHeaders;
            };
            fetchQuery(queryClient: QueryClient, hookConfig?: AxiosRequestConfigWithTypes<TQueryBody_2, TQueryQuery_2, TQueryParams_2>): Promise<any>;
            invalidate(queryClient: QueryClient): void;
            setData(queryClient: QueryClient, hookConfig: AxiosRequestConfigWithTypes<TQueryBody_2, TQueryQuery_2, TQueryParams_2>, updater: any): void;
        };
    };
    createInfiniteQuery: <TQueryData_3 extends {
        pagination: {
            page: number;
            pageCount: number;
        };
    } = {
        pagination: {
            page: number;
            pageCount: number;
        };
    }, TQueryBody_3 = any, TQueryQuery_3 extends string = string, TQueryParams_3 = any>(baseConfig?: AxiosRequestConfigWithTypes<TQueryBody_3, TQueryQuery_3, TQueryParams_3>, baseQueryOptions?: InfiniteQueryOptions<TQueryData_3, TQueryBody_3, TQueryQuery_3, TQueryParams_3>) => {
        (hookConfig?: AxiosRequestConfigWithTypes<TQueryBody_3, TQueryQuery_3, TQueryParams_3>, hookQueryOptions?: InfiniteQueryOptions<TQueryData_3, TQueryBody_3, TQueryQuery_3, TQueryParams_3>): import("@tanstack/react-query").UseInfiniteQueryResult<TQueryData_3, unknown>;
        request(fnConfig?: AxiosRequestConfigWithTypes<TQueryBody_3, TQueryQuery_3, TQueryParams_3>): Promise<TQueryData_3>;
        config: AxiosRequestConfigWithTypes<TQueryBody_3, TQueryQuery_3, TQueryParams_3>;
        getQueryKey(hookConfig?: AxiosRequestConfigWithTypes<TQueryBody_3, TQueryQuery_3, TQueryParams_3>): {
            type: string;
            url?: string;
            query?: Record<TQueryQuery_3, string | number | boolean>;
            params?: TQueryParams_3;
            data?: TQueryBody_3;
            method?: string;
            baseURL?: string;
            transformRequest?: import("axios").AxiosRequestTransformer | import("axios").AxiosRequestTransformer[];
            transformResponse?: import("axios").AxiosResponseTransformer | import("axios").AxiosResponseTransformer[];
            paramsSerializer?: (params: any) => string;
            timeout?: number;
            timeoutErrorMessage?: string;
            withCredentials?: boolean;
            adapter?: import("axios").AxiosAdapter;
            auth?: import("axios").AxiosBasicCredentials;
            responseType?: import("axios").ResponseType;
            responseEncoding?: string;
            xsrfCookieName?: string;
            xsrfHeaderName?: string;
            onUploadProgress?: (progressEvent: any) => void;
            onDownloadProgress?: (progressEvent: any) => void;
            maxContentLength?: number;
            validateStatus?: (status: number) => boolean;
            maxBodyLength?: number;
            maxRedirects?: number;
            beforeRedirect?: (options: Record<string, any>, responseDetails: {
                headers: Record<string, string>;
            }) => void;
            socketPath?: string;
            httpAgent?: any;
            httpsAgent?: any;
            proxy?: false | import("axios").AxiosProxyConfig;
            cancelToken?: import("axios").CancelToken;
            decompress?: boolean;
            transitional?: import("axios").TransitionalOptions;
            signal?: AbortSignal;
            insecureHTTPParser?: boolean;
            env?: {
                FormData?: new (...args: any[]) => object;
            };
            headers?: import("axios").AxiosRequestHeaders;
        };
        fetchQuery(queryClient: QueryClient, hookConfig?: AxiosRequestConfigWithTypes<TQueryBody_3, TQueryQuery_3, TQueryParams_3>): Promise<InfiniteData<any>>;
    };
};
export {};
//# sourceMappingURL=index.d.ts.map