export interface IPaymentDetails {
  amountInCents: number;
  cardType: string;
  cardNumberMasked: string;
  paymentProviderReference: string;
  paymentTenderCategory: string;
}
