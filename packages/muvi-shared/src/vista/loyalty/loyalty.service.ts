import { Injectable } from '@nestjs/common';
import {
  ConnectAPITokenKeyType,
  IVistaModuleOptions,
} from '../interfaces/i-vista-module-options';
import { HttpService } from '@nestjs/axios';
import { VistaApisUrls } from '../vista-apis-urls';
import {
  ValidateMemberRequest,
  ValidateMemberResponse,
} from './interfaces/validate-member.interface';

@Injectable()
export class LoyaltyService {
  constructor(
    private options: IVistaModuleOptions,
    private httpService: HttpService,
  ) {}

  private getConnectObject(platform: ConnectAPITokenKeyType) {
    return this.options.connectAPIObject.find(
      (token) => token.key == platform,
    );
  }

  async validateMember(
    data: ValidateMemberRequest,
    platform: ConnectAPITokenKeyType,
  ): Promise<ValidateMemberResponse> {
    const connectAPIObject = this.getConnectObject(platform);
    const response = await this.httpService.axiosRef.post(
      this.options.baseUrl + VistaApisUrls.VALIDATE_MEMBER,
      {
        ...data,
        ReturnMember: true,
      },
      {
        headers: {
          connectApiToken: connectAPIObject.token,
        },
      },
    );
    return this.handelResponse(response);
  }

  private handelResponse(response: any): ValidateMemberResponse {
    if (response.data.Result != 0)
      throw new Error(response.data.ErrorDescription);
    return response.data;
  }
}
