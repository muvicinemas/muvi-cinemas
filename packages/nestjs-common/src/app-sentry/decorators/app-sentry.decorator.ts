import { Inject } from '@nestjs/common';

export function InjectSentry() {
  return Inject('SentryService');
}
