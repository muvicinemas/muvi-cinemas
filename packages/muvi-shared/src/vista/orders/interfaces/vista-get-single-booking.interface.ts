export interface GetSingleBookingRequest {
  BookingId: string;
  CinemaId: string;
}

export interface GetSingleBookingResponse {
  booking: VistaBooking;
}

export interface VistaGetSingleBookingResponse {
  ResultCode: number;
  Booking: VistaBooking;
  ErrorDescription?: string;
}

export interface VistaBooking {
  BookingId: string;
  VistaTransactionId: number;
  BookingDateUtc: string;
  MemberId: string;
  CinemaId: string;
  CinemaName: string;
  CinemaNameAlt: string;
  UserSessionId: string;
  TotalValueCents: number;
  TotalBookingFeeValueCents: number;
  FirstName: string;
  LastName: string;
  BookingNumber: number;
  CurrentValueInCents: number;
  CurrentBookingFeeValueInCents: number;
  Email: string;
  Phone: string;
  ClientId: string;
  MaskedBookingCardNumber: string;
  CancelledStatus: string;
  IsPaid: boolean;
  Tickets: OrderTicket[];
  Concessions: OrderConcession[];
}

export interface OrderConcession {
  ItemId: number;
  Description: string;
  PriceInCents: number;
  OriginalPriceInCents: number;
  QuantityBooked: number;
  CollectedStatus: number;
  PackageDescription: string;
  SessionId: number;
}

export interface OrderTicket {
  TicketTypeCode: string;
  SessionId: number;
  PriceInCents: number;
  Description: string;
  DescriptionAlt: string;
  MovieName: string;
  MovieNameAlt: string;
  SeatRowId: string;
  SeatNumber: string;
  PackageDescription: string;
  PackageGroupNumber: number;
  SessionDateTimeOffset: string;
  CollectedStatus: number;
}
