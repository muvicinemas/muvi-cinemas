import { DynamicModule } from '@nestjs/common';
import { OutGoingRequestsLogAsyncOptions, OutGoingRequestsLogOptions } from './interfaces';
export declare class OutGoingRequestsLogModule {
    static register(options?: OutGoingRequestsLogOptions): DynamicModule;
    static registerAsync(options?: OutGoingRequestsLogAsyncOptions): DynamicModule;
    private static createAsyncProviders;
    private static createAsyncOptionsProvider;
}
