"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultTransports = void 0;
const winston_1 = require("winston");
const moment_1 = require("moment");
const datadog_winston_1 = require("datadog-winston");
const fast_safe_stringify_1 = require("fast-safe-stringify");
const getDefaultTransports = (options) => {
    const winstonTransports = [
        new winston_1.transports.Console({
            level: 'debug',
            log: (info, callback) => {
                if (process.env.FORMATE_LOG_MESSAGE === 'yes') {
                    const { timestamp, level = 'info', http = {}, message, duration, responseBody, } = info;
                    const { method = 'GET', status_code: statusCode = 200 } = http;
                    // eslint-disable-next-line no-console
                    console.log(`${level}: ${method} ${message} [${statusCode}] ${duration ? `${duration / 1000000}ms` : ''} ${responseBody
                        ? `{${responseBody.code} ${responseBody.message}}`
                        : ''} (${(0, moment_1.default)(timestamp).toISOString()})`);
                }
                else {
                    console.log((0, fast_safe_stringify_1.default)(info));
                }
                return callback();
            },
        }),
    ];
    if (options === null || options === void 0 ? void 0 : options.apiKey) {
        winstonTransports.push(new datadog_winston_1.default({
            apiKey: options.apiKey,
            intakeRegion: options.region || 'eu',
            hostname: options.hostname ||
                `/esc/${process.env.NODE_ENV}-${process.env.npm_package_name}`,
            service: options.service || process.env.npm_package_name,
            ddsource: 'winston-datadog-transport',
            ddtags: options.tags || `service:${process.env.npm_package_name}`,
        }));
    }
    return winstonTransports;
};
exports.getDefaultTransports = getDefaultTransports;
