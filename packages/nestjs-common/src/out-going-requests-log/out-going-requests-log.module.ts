import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { OutGoingRequestsConstants } from './constants';
import {
  OutGoingRequestsLogAsyncOptions,
  OutGoingRequestsLogOptions,
  OutGoingRequestsLogOptionsFactory,
} from './interfaces';
import { OutGoingRequestsLogService } from './services';

@Global()
@Module({})
export class OutGoingRequestsLogModule {
  static register(options: OutGoingRequestsLogOptions = {}): DynamicModule {
    return {
      module: OutGoingRequestsLogModule,
      providers: [
        {
          provide: OutGoingRequestsConstants.OUT_GOING_REQUESTS_MODULE_OPTIONS,
          useValue: options,
        },
        OutGoingRequestsLogService,
      ],
      exports: [],
    };
  }

  static registerAsync(
    options: OutGoingRequestsLogAsyncOptions = {},
  ): DynamicModule {
    return {
      module: OutGoingRequestsLogModule,
      imports: options.imports,
      providers: [
        ...this.createAsyncProviders(options),
        OutGoingRequestsLogService,
        ...(options.extraProviders || []),
      ],
      exports: [],
    };
  }

  private static createAsyncProviders(
    options: OutGoingRequestsLogAsyncOptions,
  ): Provider[] {
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
    options: OutGoingRequestsLogAsyncOptions,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: OutGoingRequestsConstants.OUT_GOING_REQUESTS_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }
    return {
      provide: OutGoingRequestsConstants.OUT_GOING_REQUESTS_MODULE_OPTIONS,
      useFactory: async (
        optionsFactory: OutGoingRequestsLogOptionsFactory,
      ) => optionsFactory.createOutGoingRequestsLogModuleOptions(),
      inject: [options.useExisting || options.useClass],
    };
  }
}
