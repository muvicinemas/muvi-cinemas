import { ShareBookingResponse } from '../../interfaces/i-vista-module-options';

export interface GetBookingResponse extends ShareBookingResponse {
  Booking: Booking;
}

export interface Booking {
  BookingId: string;
  Payments: {
    BankReference: string;
  }[];
}
