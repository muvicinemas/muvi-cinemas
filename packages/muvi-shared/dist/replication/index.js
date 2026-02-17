"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DBService = exports.ReplicationService = exports.ReplicationModule = void 0;
const replication_module_1 = require("./replication.module");
Object.defineProperty(exports, "ReplicationModule", { enumerable: true, get: function () { return replication_module_1.ReplicationModule; } });
const replication_service_1 = require("./service/replication.service");
Object.defineProperty(exports, "ReplicationService", { enumerable: true, get: function () { return replication_service_1.ReplicationService; } });
const db_service_1 = require("./service/db.service");
Object.defineProperty(exports, "DBService", { enumerable: true, get: function () { return db_service_1.DBService; } });
//# sourceMappingURL=index.js.map