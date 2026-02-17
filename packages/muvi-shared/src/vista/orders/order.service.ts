import { Injectable } from '@nestjs/common';
import {
  ConnectAPITokenKeyType,
  IVistaModuleOptions,
} from '../interfaces/i-vista-module-options';
import { HttpService } from '@nestjs/axios';
import { VistaApisUrls } from '../vista-apis-urls';
import { OrderSummary } from './interfaces/get-order-status-response.interface';
import { IPaymentDetails } from './interfaces/payment-details.interface';
import { VistaCreateOrderRequest } from './interfaces/vista-create-order-request';
import { VistaCreateOrderResponse } from './interfaces/vista-create-order-response';
import { VistaAddConcessionItemsRequest } from './interfaces/vista-add-concessions-items-request';
import { AddConcessionsItemsResponse } from './interfaces/vista-add-concessions-items-response';
import { VistaCompleteOrderRequest } from './interfaces/vista-complete-order-request';
import { CompleteOrderResponse } from './interfaces/vista-complete-order-response';
import { MarkOrderCollectedRequest } from './interfaces/vista-mark-order-collected-request';
import { MarkOrderCollectedResponse } from './interfaces/vista-mark-order-collected.response';
import {
  GetSingleBookingRequest,
  GetSingleBookingResponse,
} from './interfaces/vista-get-single-booking.interface';

@Injectable()
export class OrderService {
  constructor(
    private options: IVistaModuleOptions,
    private httpService: HttpService,
  ) {}

  private getConnectObject(platform: ConnectAPITokenKeyType) {
    return this.options.connectAPIObject.find(
      (token) => token.key == platform,
    );
  }

  async getOrderStatus(
    userSessionId: string,
    platform: ConnectAPITokenKeyType,
  ): Promise<OrderSummary> {
    const connectAPIObject = this.getConnectObject(platform);
    const body = {
      UserSessionId: userSessionId,
      ClientId: connectAPIObject.clientId,
    };
    const response = await this.httpService.axiosRef.post(
      this.options.baseUrl + VistaApisUrls.GET_ORDER_STATUS_URL,
      body,
      {
        headers: {
          connectApiToken: connectAPIObject.token,
        },
      },
    );
    return this.handelResponse(response);
  }

  async refundBooking(
    bookingId: string,
    cinemaId: string,
    platform: ConnectAPITokenKeyType,
    refundReason: string,
    paymentDetails: IPaymentDetails,
    ticketsSequence: number[],
  ): Promise<void> {
    const connectAPIObject = this.getConnectObject(platform);
    const body: any = {
      refundReason: refundReason,
      externalPaymentDetails: [paymentDetails],
    };
    if (ticketsSequence && ticketsSequence.length > 0) {
      body['sequencesToRefund'] = ticketsSequence;
    }
    let baseUrl =
      this.options.baseUrl + VistaApisUrls.REFUND_BOOKING_URL;
    baseUrl = baseUrl
      .replace(/:vistaBookingId/gi, bookingId)
      .replace(/:cinemaId/gi, cinemaId);
    const response = await this.httpService.axiosRef.post(baseUrl, body, {
      headers: {
        connectApiToken: connectAPIObject.token,
      },
    });
  }

  private handelResponse(response: any): OrderSummary {
    if (response.data.ResponseCode !== 0)
      throw new Error(response.data.ErrorDescription);
    return response.data.OrderSummary;
  }

  async initializeOrder(
    data: VistaCreateOrderRequest,
    platform: ConnectAPITokenKeyType,
  ): Promise<VistaCreateOrderResponse> {
    const response = await this.httpService.axiosRef.post(
      this.options.baseUrl + VistaApisUrls.CREATE_ORDER,
      data,
      {
        headers: {
          connectApiToken: this.getToken(platform),
        },
      },
    );
    return this.handleCreateOrderResponse(response);
  }

  async addConcessions(
    data: VistaAddConcessionItemsRequest,
    platform: ConnectAPITokenKeyType,
  ): Promise<AddConcessionsItemsResponse> {
    const response = await this.httpService.axiosRef.post(
      this.options.baseUrl + VistaApisUrls.ADD_CONCESSIONS,
      data,
      {
        headers: {
          connectApiToken: this.getToken(platform),
        },
      },
    );
    return this.handleAddConcessionsItemsResponse(response);
  }

  async completeOrder(
    data: VistaCompleteOrderRequest,
    platform: ConnectAPITokenKeyType,
  ): Promise<CompleteOrderResponse> {
    const response = await this.httpService.axiosRef.post(
      this.options.baseUrl + VistaApisUrls.COMPLETE_ORDER,
      { ...data, PerformPayment: false },
      {
        headers: {
          connectApiToken: this.getToken(platform),
        },
      },
    );
    return this.handleCompleteOrderResponse(response);
  }

  async markCollected(
    data: MarkOrderCollectedRequest,
    platform: ConnectAPITokenKeyType,
  ): Promise<MarkOrderCollectedResponse> {
    const response = await this.httpService.axiosRef.post(
      this.options.baseUrl + VistaApisUrls.MARK_COLLECTED,
      { ...data },
      {
        headers: {
          connectApiToken: this.getToken(platform),
        },
      },
    );
    return this.handleMarkOrderCollectedResponse(response);
  }

  async getSingleBooking(
    data: GetSingleBookingRequest,
    platform: ConnectAPITokenKeyType,
  ): Promise<GetSingleBookingResponse> {
    const response = await this.httpService.axiosRef.post(
      this.options.baseUrl + VistaApisUrls.GET_BOOKING_END_POINT,
      { ...data },
      {
        headers: {
          connectApiToken: this.getToken(platform),
        },
      },
    );
    return this.handleGetSingleBookingResponse(response);
  }

  private getToken(platform: ConnectAPITokenKeyType): string {
    return (
      this.options.connectAPIObject.find(
        (token) => token.key == platform,
      )?.token ?? (platform as string)
    );
  }

  private handleCreateOrderResponse(
    response: any,
  ): VistaCreateOrderResponse {
    if (response.data) {
      return {
        userSessionId: response.data.order.userSessionId,
        createdDateUtc: response.data.order.createdDateUtc,
        expiryDateUtc: response.data.order.expiryDateUtc,
      };
    }
  }

  private handleAddConcessionsItemsResponse(
    response: any,
  ): AddConcessionsItemsResponse {
    if (response.data.Result != 0)
      throw new Error(response.data.ErrorDescription);
    if (response.data && response.data.Result == 0) {
      return {
        userSessionId: response.data.Order.UserSessionId,
        createdDateUtc: response.data.Order.CreatedDateUtc,
        expiryDateUtc: response.data.Order.ExpiryDateUtc,
        totalCost: response.data.Order.TotalValueCents / 100,
        taxValue: response.data.Order.TaxValueCents / 100,
        vistaBookingNumber: response.data.Order.VistaBookingNumber,
        vistaTransactionNumber:
          response.data.Order.VistaTransactionNumber,
        cinemaId: response.data.Order.CinemaId,
        concessions: response.data.Order.Concessions,
      };
    }
  }

  private handleCompleteOrderResponse(
    response: any,
  ): CompleteOrderResponse {
    if (response.data.Result != 0)
      throw new Error(response.data.ErrorDescription);
    if (response.data && response.data.Result == 0) {
      return {
        vistaBookingId: response.data.VistaBookingId,
        vistaTransactionNumber: response.data.VistaTransNumber,
        vistaBookingNumber: response.data.VistaBookingNumber,
        cinemaId: response.data.CinemaID,
      };
    }
  }

  private handleMarkOrderCollectedResponse(
    response: any,
  ): MarkOrderCollectedResponse {
    if (response.data.Result != 0)
      throw new Error(response.data.ErrorDescription);
    if (response.data && response.data.Result == 0) {
      return {
        pickupNumber: response.data.PickupNumber,
      };
    }
  }

  private handleGetSingleBookingResponse(
    response: any,
  ): GetSingleBookingResponse {
    if (response.data.ResultCode != 0)
      throw new Error(response.data.ErrorDescription);
    return {
      booking: response.data.Booking,
    };
  }
}
