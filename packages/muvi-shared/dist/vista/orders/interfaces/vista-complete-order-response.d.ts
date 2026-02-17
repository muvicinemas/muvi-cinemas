export interface VistaCompleteOrderResponse {
    CinemaID: string;
    VistaBookingNumber: string;
    VistaBookingId: string;
    VistaTransNumber: string;
    Result: number;
    ErrorDescription: string;
    ExtendedResultCode: number;
}
export interface CompleteOrderResponse {
    cinemaId: string;
    vistaBookingNumber: string;
    vistaBookingId: string;
    vistaTransactionNumber: string;
}
