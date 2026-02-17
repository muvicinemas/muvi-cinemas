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
exports.ConcessionService = void 0;
const common_1 = require("@nestjs/common");
const i_vista_module_options_1 = require("../interfaces/i-vista-module-options");
const axios_1 = require("@nestjs/axios");
const vista_apis_urls_1 = require("../vista-apis-urls");
let ConcessionService = class ConcessionService {
    constructor(options, httpService) {
        this.options = options;
        this.httpService = httpService;
    }
    async getGroupedByTaps(cinemaId, platform) {
        const response = await this.httpService.axiosRef.get(this.options.baseUrl + vista_apis_urls_1.VistaApisUrls.CONCESSIONS_BY_TAB_URL, {
            params: {
                cinemaId,
            },
            headers: {
                connectApiToken: this.getToken(platform),
            },
        });
        return this.handelResponse(response);
    }
    getToken(platform) {
        if (!Object.keys(i_vista_module_options_1.ConnectApiTokenKey).includes(platform))
            return platform;
        return this.options.connectAPIObject.find((token) => token.key == platform).token;
    }
    handelResponse(response) {
        if (response.data.ResponseCode != 0)
            throw new Error(response.data.ErrorDescription);
        return response.data;
    }
};
exports.ConcessionService = ConcessionService;
exports.ConcessionService = ConcessionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Object, axios_1.HttpService])
], ConcessionService);
//# sourceMappingURL=concession.service.js.map