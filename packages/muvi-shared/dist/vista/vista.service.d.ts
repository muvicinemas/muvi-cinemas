import { IVistaModuleOptions } from './interfaces/i-vista-module-options';
import { ConcessionService } from './concessions/concession.service';
import { OrderService } from './orders/order.service';
import { BookingService } from './bookings/booking.service';
import { LoyaltyService } from './loyalty/loyalty.service';
export declare class VistaService {
    private options;
    concessionService: ConcessionService;
    orderService: OrderService;
    bookingService: BookingService;
    loyaltyService: LoyaltyService;
    constructor(options: IVistaModuleOptions);
}
