import { DynamicModule } from '@nestjs/common/interfaces';
import { Module } from '@nestjs/common';
import { VistaService } from './vista.service';
import { VISTA_OPTIONS } from './constants';
import {
  IVistaModuleAsyncOptions,
  IVistaModuleOptions,
} from './interfaces/i-vista-module-options';

@Module({
  exports: [VistaService],
  imports: [],
  providers: [VistaService],
})
export class VistaModule {
  static forRoot(options: IVistaModuleOptions): DynamicModule {
    const providers = [
      {
        provide: VISTA_OPTIONS,
        useValue: options,
      },
    ];
    return {
      module: VistaModule,
      providers,
      exports: providers,
    };
  }

  static forRootAsync(options: IVistaModuleAsyncOptions): DynamicModule {
    const providers = [
      {
        provide: VISTA_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      },
    ];
    return {
      module: VistaModule,
      imports: options.imports || [],
      providers,
      exports: providers,
    };
  }
}
