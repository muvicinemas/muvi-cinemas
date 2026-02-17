import { ConnectAPITokenKeyType, IVistaModuleOptions } from '../interfaces/i-vista-module-options';
import { HttpService } from '@nestjs/axios';
import { ValidateMemberRequest, ValidateMemberResponse } from './interfaces/validate-member.interface';
export declare class LoyaltyService {
    private options;
    private httpService;
    constructor(options: IVistaModuleOptions, httpService: HttpService);
    private getConnectObject;
    validateMember(data: ValidateMemberRequest, platform: ConnectAPITokenKeyType): Promise<ValidateMemberResponse>;
    private handelResponse;
}
