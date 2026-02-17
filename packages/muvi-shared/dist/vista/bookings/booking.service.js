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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const vista_apis_urls_1 = require("../vista-apis-urls");
let BookingService = class BookingService {
    constructor(options, httpService) {
        this.options = options;
        this.httpService = httpService;
    }
    getConnectObject(platform) {
        return this.options.connectAPIObject.find((token) => token.key == platform);
    }
    async getBooking(bookingId, cinemaId, platform) {
        const connectAPIObject = this.getConnectObject(platform);
        const body = {
            BookingId: bookingId,
            CinemaId: cinemaId,
        };
        const response = await this.httpService.axiosRef.post(this.options.baseUrl + vista_apis_urls_1.VistaApisUrls.GET_BOOKING_URL, body, {
            headers: {
                connectApiToken: connectAPIObject.token,
            },
        });
        return this.handelResponse(response);
    }
    handelResponse(response) {
        if (response.data.ResultCode != 0)
            throw new Error(response.data.ErrorDescription);
        return response.data.Booking;
    }
};
exports.BookingService = BookingService;
exports.BookingService = BookingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Object, axios_1.HttpService])
], BookingService);
//# sourceMappingURL=booking.service.js.map