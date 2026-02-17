export interface VistaCreateOrderResponse {
  expiryDateUtc: string;
  createdDateUtc: string;
  userSessionId: string;
}

export interface VistaCreateOrderResponseData {
  order: VistaCreateOrderResponse;
}
