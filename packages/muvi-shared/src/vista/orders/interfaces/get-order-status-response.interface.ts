import { ShareVistaResponse } from '../../interfaces/i-vista-module-options';

export interface GetOrderStatusResponse extends ShareVistaResponse {
  OrderSummary: OrderSummary;
}

export interface OrderSummary {
  UserSessionId: string;
  CinemaId: string;
  VistaBookingId: string;
  VistaBookingNumber: string;
}
