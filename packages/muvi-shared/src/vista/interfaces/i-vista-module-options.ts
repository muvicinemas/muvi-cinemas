import { ModuleMetadata } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';

export interface IVistaModuleOptions {
  baseUrl: string;
  connectAPIObject: ConnectApiObject[];
  httpService: HttpService;
}

export interface ConnectApiObject {
  key: ConnectAPITokenKeyType;
  token: string;
  clientId?: string;
}

export enum ConnectApiTokenKey {
  WEBSITE = 'website',
  ANDROID = 'android',
  IOS = 'ios',
  HUAWEI = 'huawei',
  KIOSK = 'kiosk',
}

export interface IVistaModuleOptionsFactory {
  createThrottlerOptions():
    | Promise<IVistaModuleOptions>
    | IVistaModuleOptions;
}

export type ConnectAPITokenKeyType = ConnectApiTokenKey | string;

export interface IVistaModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (
    ...args: any[]
  ) => Promise<IVistaModuleOptions> | IVistaModuleOptions;
  inject?: any[];
}

export interface ShareVistaResponse {
  ResponseCode: number;
  ErrorDescription?: string;
}

export interface ShareBookingResponse {
  ResultCode: number;
  ErrorDescription?: string;
}
