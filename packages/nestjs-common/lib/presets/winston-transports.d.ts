import * as Transport from 'winston-transport';
export interface DatadogTransportOptions {
    apiKey: string;
    region?: string;
    hostname?: string;
    service?: string;
    tags?: string;
}
export declare const getDefaultTransports: (options?: DatadogTransportOptions) => Transport[];
