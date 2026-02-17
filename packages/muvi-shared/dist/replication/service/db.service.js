"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DBService = void 0;
const common_1 = require("@nestjs/common");
let DBService = class DBService {
    async initializeReplication(connect) {
        const result = await this.runQuery(connect, `ALTER SYSTEM SET wal_level = logical;`);
    }
    async checkPublicationIsExist(connect, publicationName) {
        const result = await this.runQuery(connect, `select * from pg_catalog.pg_publication where pubname  = '${publicationName}';`);
        return result.rows.length == 0 ? false : true;
    }
    async checkSubscriptionIsExist(connect, subscriptionName) {
        const result = await this.runQuery(connect, `select * from pg_catalog.pg_subscription where subname  = '${subscriptionName}';`);
        return result.rows.length == 0 ? false : true;
    }
    async createPublication(connect, publicationName, tables, publishType, publishConditions = []) {
        await this.runQuery(connect, `CREATE PUBLICATION ${publicationName} FOR TABLE ${tables.join(',')} with (publish = '${publishType}');`);
    }
    async dropPublication(connect, publicationName) {
        await this.runQuery(connect, `DROP PUBLICATION ${publicationName}`);
    }
    async dropSubscription(connect, subscriptionName, tables, isTheSameCluster = false, publicationConnect = null) {
        await this.runQuery(connect, `ALTER SUBSCRIPTION  ${subscriptionName} DISABLE`);
        await this.runQuery(connect, `ALTER SUBSCRIPTION ${subscriptionName} SET (slot_name=NONE)`);
        await this.runQuery(connect, `DROP SUBSCRIPTION ${subscriptionName}`);
        await this.runQuery(isTheSameCluster ? publicationConnect : connect, `select pg_drop_replication_slot('${subscriptionName}');`);
        for (let index = 0; index < tables.length; index++) {
            await this.runQuery(connect, `delete from ${tables[index]}`);
        }
    }
    async runQuery(connect, query) {
        console.log(query);
        const result = await connect.query(query);
        console.log(JSON.stringify(result));
        return result;
    }
    async createSubscription(subscriptionName, publicationName, connect, { host, port, password, database, user }, inTheSameCluster = false, publicationConnect = null) {
        if (inTheSameCluster) {
            await this.runQuery(publicationConnect, `SELECT pg_cancel_backend(pid) FROM pg_stat_activity WHERE state = 'active' and pid <> pg_backend_pid();SELECT * FROM pg_create_logical_replication_slot('${subscriptionName}', 'pgoutput');`);
        }
        await this.runQuery(connect, `CREATE SUBSCRIPTION ${subscriptionName} CONNECTION
    'host=${host} port=${port} dbname=${database} user=${user} password=${password}'
    PUBLICATION ${publicationName}  with ( create_slot = ${!inTheSameCluster}, copy_data = true)`);
    }
    async disableCheckForeignKey(connect) {
        await this.runQuery(connect, `SET session_replication_role = 'replica';`);
    }
    async enableCheckForeignKey(connect) {
        await this.runQuery(connect, `SET session_replication_role = 'origin';    `);
    }
    async getCount(connect, table) {
        const result = await this.runQuery(connect, `select count(*) as count from ${table}`);
        return result.rows[0]['count'];
    }
};
exports.DBService = DBService;
exports.DBService = DBService = __decorate([
    (0, common_1.Injectable)()
], DBService);
//# sourceMappingURL=db.service.js.map