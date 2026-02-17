"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InjectSentry = void 0;
const common_1 = require("@nestjs/common");
function InjectSentry() {
    return (0, common_1.Inject)('SentryService');
}
exports.InjectSentry = InjectSentry;
