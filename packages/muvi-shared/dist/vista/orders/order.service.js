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
exports.OrderService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const vista_apis_urls_1 = require("../vista-apis-urls");
let OrderService = class OrderService {
    constructor(options, httpService) {
        this.options = options;
        this.httpService = httpService;
    }
    getConnectObject(platform) {
        return this.options.connectAPIObject.find((token) => token.key == platform);
    }
    async getOrderStatus(userSessionId, platform) {
        const connectAPIObject = this.getConnectObject(platform);
        const body = {
            UserSessionId: userSessionId,
            ClientId: connectAPIObject.clientId,
        };
        const response = await this.httpService.axiosRef.post(this.options.baseUrl + vista_apis_urls_1.VistaApisUrls.GET_ORDER_STATUS_URL, body, {
            headers: {
                connectApiToken: connectAPIObject.token,
            },
        });
        return this.handelResponse(response);
    }
    async refundBooking(bookingId, cinemaId, platform, refundReason, paymentDetails, ticketsSequence) {
        const connectAPIObject = this.getConnectObject(platform);
        const body = {
            refundReason: refundReason,
            externalPaymentDetails: [paymentDetails],
        };
        if (ticketsSequence && ticketsSequence.length > 0) {
            body['sequencesToRefund'] = ticketsSequence;
        }
        let baseUrl = this.options.baseUrl + vista_apis_urls_1.VistaApisUrls.REFUND_BOOKING_URL;
        baseUrl = baseUrl
            .replace(/:vistaBookingId/gi, bookingId)
            .replace(/:cinemaId/gi, cinemaId);
        const response = await this.httpService.axiosRef.post(baseUrl, body, {
            headers: {
                connectApiToken: connectAPIObject.token,
            },
        });
    }
    handelResponse(response) {
        if (response.data.ResponseCode !== 0)
            throw new Error(response.data.ErrorDescription);
        return response.data.OrderSummary;
    }
    async initializeOrder(data, platform) {
        const response = await this.httpService.axiosRef.post(this.options.baseUrl + vista_apis_urls_1.VistaApisUrls.CREATE_ORDER, data, {
            headers: {
                connectApiToken: this.getToken(platform),
            },
        });
        return this.handleCreateOrderResponse(response);
    }
    async addConcessions(data, platform) {
        const response = await this.httpService.axiosRef.post(this.options.baseUrl + vista_apis_urls_1.VistaApisUrls.ADD_CONCESSIONS, data, {
            headers: {
                connectApiToken: this.getToken(platform),
            },
        });
        return this.handleAddConcessionsItemsResponse(response);
    }
    async completeOrder(data, platform) {
        const response = await this.httpService.axiosRef.post(this.options.baseUrl + vista_apis_urls_1.VistaApisUrls.COMPLETE_ORDER, Object.assign(Object.assign({}, data), { PerformPayment: false }), {
            headers: {
                connectApiToken: this.getToken(platform),
            },
        });
        return this.handleCompleteOrderResponse(response);
    }
    async markCollected(data, platform) {
        const response = await this.httpService.axiosRef.post(this.options.baseUrl + vista_apis_urls_1.VistaApisUrls.MARK_COLLECTED, Object.assign({}, data), {
            headers: {
                connectApiToken: this.getToken(platform),
            },
        });
        return this.handleMarkOrderCollectedResponse(response);
    }
    async getSingleBooking(data, platform) {
        const response = await this.httpService.axiosRef.post(this.options.baseUrl + vista_apis_urls_1.VistaApisUrls.GET_BOOKING_END_POINT, Object.assign({}, data), {
            headers: {
                connectApiToken: this.getToken(platform),
            },
        });
        return this.handleGetSingleBookingResponse(response);
    }
    getToken(platform) {
        var _a, _b;
        return ((_b = (_a = this.options.connectAPIObject.find((token) => token.key == platform)) === null || _a === void 0 ? void 0 : _a.token) !== null && _b !== void 0 ? _b : platform);
    }
    handleCreateOrderResponse(response) {
        if (response.data) {
            return {
                userSessionId: response.data.order.userSessionId,
                createdDateUtc: response.data.order.createdDateUtc,
                expiryDateUtc: response.data.order.expiryDateUtc,
            };
        }
    }
    handleAddConcessionsItemsResponse(response) {
        if (response.data.Result != 0)
            throw new Error(response.data.ErrorDescription);
        if (response.data && response.data.Result == 0) {
            return {
                userSessionId: response.data.Order.UserSessionId,
                createdDateUtc: response.data.Order.CreatedDateUtc,
                expiryDateUtc: response.data.Order.ExpiryDateUtc,
                totalCost: response.data.Order.TotalValueCents / 100,
                taxValue: response.data.Order.TaxValueCents / 100,
                vistaBookingNumber: response.data.Order.VistaBookingNumber,
                vistaTransactionNumber: response.data.Order.VistaTransactionNumber,
                cinemaId: response.data.Order.CinemaId,
                concessions: response.data.Order.Concessions,
            };
        }
    }
    handleCompleteOrderResponse(response) {
        if (response.data.Result != 0)
            throw new Error(response.data.ErrorDescription);
        if (response.data && response.data.Result == 0) {
            return {
                vistaBookingId: response.data.VistaBookingId,
                vistaTransactionNumber: response.data.VistaTransNumber,
                vistaBookingNumber: response.data.VistaBookingNumber,
                cinemaId: response.data.CinemaID,
            };
        }
    }
    handleMarkOrderCollectedResponse(response) {
        if (response.data.Result != 0)
            throw new Error(response.data.ErrorDescription);
        if (response.data && response.data.Result == 0) {
            return {
                pickupNumber: response.data.PickupNumber,
            };
        }
    }
    handleGetSingleBookingResponse(response) {
        if (response.data.ResultCode != 0)
            throw new Error(response.data.ErrorDescription);
        return {
            booking: response.data.Booking,
        };
    }
};
exports.OrderService = OrderService;
exports.OrderService = OrderService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Object, axios_1.HttpService])
], OrderService);
//# sourceMappingURL=order.service.js.map