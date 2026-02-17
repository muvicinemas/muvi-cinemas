import { ModuleMetadata, Provider, Type } from '@nestjs/common';
import { AppSentryOptions } from '../types/app-sentry-options';

export interface AppSentryModuleOptionsFactory {
  createAppSentryModuleOptions():
    | Promise<AppSentryOptions>
    | AppSentryOptions;
}

export interface AppSentryModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<AppSentryModuleOptionsFactory>;
  useClass?: Type<AppSentryModuleOptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<AppSentryOptions> | AppSentryOptions;
  inject?: any[];
  extraProviders?: Provider[];
}
