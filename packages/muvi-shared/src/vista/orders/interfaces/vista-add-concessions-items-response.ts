import { ConcessionItem } from './vista-add-concessions-items-request';

export interface VistaAddConcessionsItemsResponse {
  ExpiryDateUtc: string;
  CreatedDateUtc: string;
  CinemaId: string;
  UserSessionId: string;
  TotalValueCents: number;
  TaxValueCents: number;
  VistaTransactionNumber: number;
  VistaBookingNumber: number;
  Concessions: ConcessionItem[];
}

export interface VistaAddConcessionsItemsResponseData {
  Order: VistaAddConcessionsItemsResponse;
  Result: number;
  ErrorDescription: string;
  ExtendedResultCode: number;
}

export interface AddConcessionsItemsResponse {
  expiryDateUtc: string;
  createdDateUtc: string;
  cinemaId: string;
  userSessionId: string;
  totalCost: number;
  taxValue: number;
  vistaTransactionNumber: number;
  vistaBookingNumber: number;
  concessions: ConcessionItem[];
}
