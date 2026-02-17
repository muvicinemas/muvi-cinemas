import { ConnectAPITokenKeyType, IVistaModuleOptions } from '../interfaces/i-vista-module-options';
import { HttpService } from '@nestjs/axios';
import { Booking } from './interface/get-booking-response.interface';
export declare class BookingService {
    private options;
    private httpService;
    constructor(options: IVistaModuleOptions, httpService: HttpService);
    private getConnectObject;
    getBooking(bookingId: string, cinemaId: string, platform: ConnectAPITokenKeyType): Promise<Booking>;
    private handelResponse;
}
