export interface VistaCompleteOrderRequest {
  BookingMode: number;
  UserSessionId: string;
  CustomerEmail?: string;
  CustomerName?: string;
  CustomerPhone?: string;
  PaymentInfo: PaymentInfo;
}

export interface PaymentInfo {
  PaymentValueCents: number;
  CardNumber?: string;
  CardType?: string;
  CardExpiryMonth?: string;
  CardExpiryYear?: string;
  PaymentTokenType?: string;
  PaymentTenderCategory?: string;
  UseAsBookingRef?: boolean;
  BankTransactionNumber?: string;
}
