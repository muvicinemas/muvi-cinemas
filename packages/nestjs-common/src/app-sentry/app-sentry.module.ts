import { DynamicModule, Global, Module } from '@nestjs/common';
import { AppSentryConstants } from './constants';
import * as Sentry from '@sentry/node';
import { AppSentryService } from './services/app-sentry.service';
import { AppSentryModuleAsyncOptions } from './interfaces';
import { AppSentryOptions } from './types/app-sentry-options';

@Global()
@Module({})
export class AppSentryModule {
  static register(options: AppSentryOptions): DynamicModule {
    Sentry.init(options);
    return {
      module: AppSentryModule,
      providers: [
        {
          provide: AppSentryConstants.APP_SENTRY_MODULE_OPTIONS,
          useValue: options,
        },
        {
          provide: AppSentryConstants.APP_SENTRY_INSTANCE_TOKEN,
          useValue: Sentry,
        },
        AppSentryService,
      ],
      exports: [AppSentryService],
    };
  }

  static registerAsync(options: AppSentryModuleAsyncOptions): DynamicModule {
    return {
      module: AppSentryModule,
      imports: options.imports,
      providers: [
        ...this.createAsyncProviders(options),
        AppSentryService,
        {
          provide: AppSentryConstants.APP_SENTRY_INSTANCE_TOKEN,
          useFactory: (appSentryOptions: AppSentryOptions) => {
            Sentry.init(appSentryOptions);
            return Sentry;
          },
          inject: [AppSentryConstants.APP_SENTRY_MODULE_OPTIONS],
        },
        ...(options.extraProviders || []),
      ],
      exports: [AppSentryService],
    };
  }

  private static createAsyncProviders(options: AppSentryModuleAsyncOptions) {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }
    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: options.useClass,
        useClass: options.useClass,
      },
    ];
  }

  private static createAsyncOptionsProvider(
    options: AppSentryModuleAsyncOptions,
  ) {
    if (options.useFactory) {
      return {
        provide: AppSentryConstants.APP_SENTRY_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }
    return {
      provide: AppSentryConstants.APP_SENTRY_MODULE_OPTIONS,
      useFactory: async (optionsFactory: any) =>
        optionsFactory.createAppSentryModuleOptions(),
      inject: [options.useExisting || options.useClass],
    };
  }
}
