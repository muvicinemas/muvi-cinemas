import { Injectable } from '@nestjs/common';
import {
  ConnectApiTokenKey,
  ConnectAPITokenKeyType,
  IVistaModuleOptions,
} from '../interfaces/i-vista-module-options';
import { HttpService } from '@nestjs/axios';
import { VistaApisUrls } from '../vista-apis-urls';
import { GetGroupedByTypeResponse } from './interfaces/get-grouped-by-type-response';

@Injectable()
export class ConcessionService {
  constructor(
    private options: IVistaModuleOptions,
    private httpService: HttpService,
  ) {}

  async getGroupedByTaps(
    cinemaId: string,
    platform: ConnectAPITokenKeyType,
  ): Promise<GetGroupedByTypeResponse> {
    const response = await this.httpService.axiosRef.get(
      this.options.baseUrl + VistaApisUrls.CONCESSIONS_BY_TAB_URL,
      {
        params: {
          cinemaId,
        },
        headers: {
          connectApiToken: this.getToken(platform),
        },
      },
    );
    return this.handelResponse(response);
  }

  private getToken(platform: ConnectAPITokenKeyType): string {
    if (
      !Object.keys(ConnectApiTokenKey).includes(platform as string)
    )
      return platform as string;
    return this.options.connectAPIObject.find(
      (token) => token.key == platform,
    ).token;
  }

  private handelResponse(response: any): GetGroupedByTypeResponse {
    if (response.data.ResponseCode != 0)
      throw new Error(response.data.ErrorDescription);
    return response.data;
  }
}
