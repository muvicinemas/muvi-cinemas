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
exports.ReplicationService = void 0;
const common_1 = require("@nestjs/common");
const pg_1 = require("pg");
const db_service_1 = require("./db.service");
let ReplicationService = class ReplicationService {
    constructor(dbService) {
        this.dbService = dbService;
    }
    async initializeReplication(connectConfig) {
        const connect = new pg_1.Client(connectConfig);
        await connect.connect();
        await this.dbService.initializeReplication(connect);
    }
    async dropPublication(connectConfig, publicationName) {
        const connect = new pg_1.Client(connectConfig);
        await connect.connect();
        const publicationIsExist = await this.dbService.checkPublicationIsExist(connect, publicationName);
        if (publicationIsExist) {
            await this.dbService.dropPublication(connect, publicationName);
        }
    }
    async dropSubscription(publicationConnectConfig, subscriptionConnectConfig, subscriptionName, tables) {
        const subscriptionConnect = new pg_1.Client(subscriptionConnectConfig);
        await subscriptionConnect.connect();
        let isTheSameCluster = false;
        let publicationConnect = null;
        if (publicationConnectConfig.host == subscriptionConnectConfig.host &&
            publicationConnectConfig.port == subscriptionConnectConfig.port) {
            isTheSameCluster = true;
            publicationConnect = new pg_1.Client(publicationConnectConfig);
            await publicationConnect.connect();
        }
        const subscriptionIsExist = await this.dbService.checkSubscriptionIsExist(subscriptionConnect, subscriptionName);
        if (subscriptionIsExist) {
            await this.dbService.dropSubscription(subscriptionConnect, subscriptionName, tables, isTheSameCluster, publicationConnect);
        }
    }
    async createPublication(connectConfig, publicationName, tables, isRebuild, publicationType, publishConditions) {
        const connect = new pg_1.Client(connectConfig);
        await connect.connect();
        const publicationIsExist = await this.dbService.checkPublicationIsExist(connect, publicationName);
        if (!publicationIsExist) {
            await this.dbService.createPublication(connect, publicationName, tables, this.preparePublicationType(publicationType), publishConditions);
        }
        else if (isRebuild) {
            await this.dbService.dropPublication(connect, publicationName);
            await this.dbService.createPublication(connect, publicationName, tables, this.preparePublicationType(publicationType), publishConditions);
        }
    }
    async createSubscription(publicationConnectConfig, subscriptionConnectConfig, publicationName, subscriptionName, isRebuild, tables, checkForeignKey) {
        const publicationConnect = new pg_1.Client(publicationConnectConfig);
        await publicationConnect.connect();
        const publicationIsExist = await this.dbService.checkPublicationIsExist(publicationConnect, publicationName);
        let isTheSameCluster = false;
        if (publicationConnectConfig.host == subscriptionConnectConfig.host &&
            publicationConnectConfig.port == subscriptionConnectConfig.port) {
            isTheSameCluster = true;
        }
        if (publicationIsExist) {
            const subscriptionConnect = new pg_1.Client(subscriptionConnectConfig);
            await subscriptionConnect.connect();
            const subscriptionIsExist = await this.dbService.checkSubscriptionIsExist(subscriptionConnect, subscriptionName);
            if (!subscriptionIsExist) {
                await this.dbService.createSubscription(subscriptionName, publicationName, subscriptionConnect, publicationConnectConfig, isTheSameCluster, publicationConnect);
            }
            else if (isRebuild) {
                if (checkForeignKey) {
                    await this.dbService.disableCheckForeignKey(subscriptionConnect);
                }
                await this.dbService.dropSubscription(subscriptionConnect, subscriptionName, tables, isTheSameCluster, publicationConnect);
                await this.dbService.createSubscription(subscriptionName, publicationName, subscriptionConnect, publicationConnectConfig, isTheSameCluster, publicationConnect);
                if (checkForeignKey) {
                    await this.dbService.enableCheckForeignKey(subscriptionConnect);
                }
            }
        }
        else {
            console.log(`${publicationName} is not exist`);
        }
    }
    async checkReplication(publicationConnectConfig, subscriptionConnectConfig, tables) {
        const publicationConnect = new pg_1.Client(publicationConnectConfig);
        await publicationConnect.connect();
        const subscriptionConnect = new pg_1.Client(subscriptionConnectConfig);
        await subscriptionConnect.connect();
        for (let index = 0; index < tables.length; index++) {
            const element = tables[index];
            let publicationDBCount;
            let subscriptionDBCount;
            await Promise.all([
                (publicationDBCount = await this.dbService.getCount(publicationConnect, element)),
                (subscriptionDBCount = await this.dbService.getCount(subscriptionConnect, element)),
            ]);
            console.log(`table '${element}' in publication DB is ${publicationDBCount} and in subscription DB is ${subscriptionDBCount}`);
        }
    }
    preparePublicationType(data) {
        const publicationTypeArray = [];
        if (data.isWithDelete) {
            publicationTypeArray.push('delete');
        }
        if (data.isWithInsert) {
            publicationTypeArray.push('insert');
        }
        if (data.isWithTruncate) {
            publicationTypeArray.push('truncate');
        }
        if (data.isWithUpdate) {
            publicationTypeArray.push('update');
        }
        return publicationTypeArray.join();
    }
};
exports.ReplicationService = ReplicationService;
exports.ReplicationService = ReplicationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [db_service_1.DBService])
], ReplicationService);
//# sourceMappingURL=replication.service.js.map