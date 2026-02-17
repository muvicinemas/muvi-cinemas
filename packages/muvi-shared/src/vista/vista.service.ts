import { Inject, Injectable } from '@nestjs/common';
import { IVistaModuleOptions } from './interfaces/i-vista-module-options';
import { ConcessionService } from './concessions/concession.service';
import { VISTA_OPTIONS } from './constants';
import { OrderService } from './orders/order.service';
import { BookingService } from './bookings/booking.service';
import { LoyaltyService } from './loyalty/loyalty.service';

@Injectable()
export class VistaService {
  concessionService: ConcessionService;
  orderService: OrderService;
  bookingService: BookingService;
  loyaltyService: LoyaltyService;

  constructor(@Inject(VISTA_OPTIONS) private options: IVistaModuleOptions) {
    this.concessionService = new ConcessionService(
      options,
      options.httpService,
    );
    this.orderService = new OrderService(options, options.httpService);
    this.bookingService = new BookingService(options, options.httpService);
    this.loyaltyService = new LoyaltyService(options, options.httpService);
  }
}
