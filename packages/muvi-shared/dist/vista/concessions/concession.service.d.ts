import { ConnectAPITokenKeyType, IVistaModuleOptions } from '../interfaces/i-vista-module-options';
import { HttpService } from '@nestjs/axios';
import { GetGroupedByTypeResponse } from './interfaces/get-grouped-by-type-response';
export declare class ConcessionService {
    private options;
    private httpService;
    constructor(options: IVistaModuleOptions, httpService: HttpService);
    getGroupedByTaps(cinemaId: string, platform: ConnectAPITokenKeyType): Promise<GetGroupedByTypeResponse>;
    private getToken;
    private handelResponse;
}
