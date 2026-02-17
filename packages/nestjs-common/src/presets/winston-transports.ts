import { transports } from 'winston';
import * as Transport from 'winston-transport';
import moment from 'moment';
import DatadogWinston from 'datadog-winston';
import stringify from 'fast-safe-stringify';

export interface DatadogTransportOptions {
  apiKey: string;
  region?: string;
  hostname?: string;
  service?: string;
  tags?: string;
}

export const getDefaultTransports = (
  options?: DatadogTransportOptions,
): Transport[] => {
  const winstonTransports: Transport[] = [
    new transports.Console({
      level: 'debug',
      log: (info: any, callback: () => void) => {
        if (process.env.FORMATE_LOG_MESSAGE === 'yes') {
          const {
            timestamp,
            level = 'info',
            http = {},
            message,
            duration,
            responseBody,
          } = info;
          const { method = 'GET', status_code: statusCode = 200 } = http;
          // eslint-disable-next-line no-console
          console.log(
            `${level}: ${method} ${message} [${statusCode}] ${
              duration ? `${duration / 1000000}ms` : ''
            } ${
              responseBody
                ? `{${responseBody.code} ${responseBody.message}}`
                : ''
            } (${moment(timestamp).toISOString()})`,
          );
        } else {
          console.log(stringify(info));
        }
        return callback();
      },
    }),
  ];

  if (options?.apiKey) {
    winstonTransports.push(
      new DatadogWinston({
        apiKey: options.apiKey,
        intakeRegion: options.region || 'eu',
        hostname:
          options.hostname ||
          `/esc/${process.env.NODE_ENV}-${process.env.npm_package_name}`,
        service: options.service || process.env.npm_package_name,
        ddsource: 'winston-datadog-transport',
        ddtags: options.tags || `service:${process.env.npm_package_name}`,
      }),
    );
  }

  return winstonTransports;
};
