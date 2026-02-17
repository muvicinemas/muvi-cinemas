import Sentry from '@sentry/node';

export type AppSentryOptions = {
  tags?: { [key: string]: string };
} & Sentry.NodeOptions;
