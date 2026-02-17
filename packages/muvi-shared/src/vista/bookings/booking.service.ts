import { Injectable } from '@nestjs/common';
import {
  ConnectAPITokenKeyType,
  IVistaModuleOptions,
} from '../interfaces/i-vista-module-options';
import { HttpService } from '@nestjs/axios';
import { VistaApisUrls } from '../vista-apis-urls';
import { Booking } from './interface/get-booking-response.interface';

@Injectable()
export class BookingService {
  constructor(
    private options: IVistaModuleOptions,
    private httpService: HttpService,
  ) {}

  private getConnectObject(platform: ConnectAPITokenKeyType) {
    return this.options.connectAPIObject.find(
      (token) => token.key == platform,
    );
  }

  async getBooking(
    bookingId: string,
    cinemaId: string,
    platform: ConnectAPITokenKeyType,
  ): Promise<Booking> {
    const connectAPIObject = this.getConnectObject(platform);
    const body = {
      BookingId: bookingId,
      CinemaId: cinemaId,
    };
    const response = await this.httpService.axiosRef.post(
      this.options.baseUrl + VistaApisUrls.GET_BOOKING_URL,
      body,
      {
        headers: {
          connectApiToken: connectAPIObject.token,
        },
      },
    );
    return this.handelResponse(response);
  }

  private handelResponse(response: any): Booking {
    if (response.data.ResultCode != 0)
      throw new Error(response.data.ErrorDescription);
    return response.data.Booking;
  }
}
