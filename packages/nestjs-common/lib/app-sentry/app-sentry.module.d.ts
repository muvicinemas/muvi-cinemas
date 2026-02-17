import { DynamicModule } from '@nestjs/common';
import { AppSentryModuleAsyncOptions } from './interfaces';
import { AppSentryOptions } from './types/app-sentry-options';
export declare class AppSentryModule {
    static register(options: AppSentryOptions): DynamicModule;
    static registerAsync(options: AppSentryModuleAsyncOptions): DynamicModule;
    private static createAsyncProviders;
    private static createAsyncOptionsProvider;
}
