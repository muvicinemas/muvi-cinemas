"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VistaService = void 0;
const common_1 = require("@nestjs/common");
const concession_service_1 = require("./concessions/concession.service");
const constants_1 = require("./constants");
const order_service_1 = require("./orders/order.service");
const booking_service_1 = require("./bookings/booking.service");
const loyalty_service_1 = require("./loyalty/loyalty.service");
let VistaService = class VistaService {
    constructor(options) {
        this.options = options;
        this.concessionService = new concession_service_1.ConcessionService(options, options.httpService);
        this.orderService = new order_service_1.OrderService(options, options.httpService);
        this.bookingService = new booking_service_1.BookingService(options, options.httpService);
        this.loyaltyService = new loyalty_service_1.LoyaltyService(options, options.httpService);
    }
};
exports.VistaService = VistaService;
exports.VistaService = VistaService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(constants_1.VISTA_OPTIONS)),
    __metadata("design:paramtypes", [Object])
], VistaService);
//# sourceMappingURL=vista.service.js.map