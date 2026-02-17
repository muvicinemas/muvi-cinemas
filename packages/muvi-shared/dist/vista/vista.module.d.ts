import { DynamicModule } from '@nestjs/common/interfaces';
import { IVistaModuleAsyncOptions, IVistaModuleOptions } from './interfaces/i-vista-module-options';
export declare class VistaModule {
    static forRoot(options: IVistaModuleOptions): DynamicModule;
    static forRootAsync(options: IVistaModuleAsyncOptions): DynamicModule;
}
