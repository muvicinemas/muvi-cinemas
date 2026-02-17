/**
 * Backend Audit Report Generator
 * Generates a comprehensive HTML report of all third-party integrations,
 * cron jobs, queues, and background tasks in the Muvi Cinemas backend.
 *
 * Run: node documentation/generate-backend-audit.js
 */

const fs = require('fs');
const path = require('path');

// ─── DATA ───────────────────────────────────────────────────────────────────

const thirdPartyIntegrations = [
  {
    id: 'vista',
    name: 'Vista Entertainment',
    category: 'Cinema Management',
    icon: '🎬',
    purpose: 'Core cinema management system — syncs cinemas, films, sessions, genres, people, seat maps, ticket types. Handles order creation, seat selection, payment, booking, refunds, loyalty validation.',
    services: ['main', 'fb', 'offer'],
    protocol: 'REST (OData + Ticketing + Loyalty + Booking APIs)',
    auth: 'API Token per platform (Android, iOS, Web, Huawei, Kiosk)',
    envVars: ['VISTA_BASE_URL', 'VISTA_ANDROID_TOKEN', 'VISTA_IOS_TOKEN', 'VISTA_WEBSITE_TOKEN', 'VISTA_HUAWEI_TOKEN', 'VISTA_KIOSK_TOKEN', 'VISTA_CLUB_ID'],
    endpoints: [
      { method: 'GET', path: '/OData.svc/Cinemas', desc: 'Sync cinemas' },
      { method: 'GET', path: '/OData.svc/Films', desc: 'Sync films' },
      { method: 'GET', path: '/OData.svc/Sessions', desc: 'Sync sessions/showtimes' },
      { method: 'GET', path: '/OData.svc/FilmGenres', desc: 'Sync genres' },
      { method: 'GET', path: '/OData.svc/Persons', desc: 'Sync cast/crew' },
      { method: 'GET', path: '/OData.svc/Attributes', desc: 'Sync experiences (IMAX, 4DX, etc.)' },
      { method: 'POST', path: '/orders/', desc: 'Create ticket order' },
      { method: 'POST', path: '/orders/{id}/sessions/{sid}/set-tickets/', desc: 'Select seats' },
      { method: 'POST', path: '/RESTTicketing.svc/order/payment', desc: 'Submit payment to Vista' },
      { method: 'POST', path: '/RESTTicketing.svc/order/continue', desc: 'Restart session' },
      { method: 'POST', path: '/RESTLoyalty.svc/member/validate', desc: 'Validate loyalty member' },
      { method: 'POST', path: '/RESTBooking.svc/booking', desc: 'Get booking details' },
      { method: 'POST', path: '/RESTBooking.svc/booking/search', desc: 'Search bookings' },
      { method: 'GET', path: '/cinemas/{id}/sessions/{sid}/seat-plan', desc: 'Get seat plan' },
      { method: 'GET', path: '/cinemas/{id}/sessions/{sid}/tickets', desc: 'Get ticket types' },
      { method: 'GET', path: '/vouchers/{barcode}', desc: 'Validate voucher (Go)' },
      { method: 'SDK', path: 'orderService.refundBooking()', desc: 'Refund booking' },
      { method: 'SDK', path: 'orderService.completeOrder()', desc: 'Complete order' },
      { method: 'SDK', path: 'addConcessions()', desc: 'Add F&B to order' },
      { method: 'SDK', path: 'markCollected()', desc: 'Mark F&B collected' },
    ],
    files: [
      'alpha-muvi-main-main/src/shared/service/vista/vista.service.ts',
      'alpha-muvi-main-main/src/vista/services/ (6 sync services)',
      'alpha-muvi-fb-main/src/shared/service/vista.service.ts',
      'alpha-muvi-offer/src/vista/vista.service.go',
    ],
    critical: true,
  },
  {
    id: 'hyperpay',
    name: 'HyperPay',
    category: 'Payment Gateway',
    icon: '💳',
    purpose: 'Primary payment gateway — card tokenization, direct payments, Apple Pay, payment status checks, refunds.',
    services: ['payment'],
    protocol: 'REST (HTTPS)',
    auth: 'Bearer Token',
    envVars: ['HYPER_PAY_BASE_URL', 'HYPER_PAY_TOKEN', 'HYPER_PAY_ENTITY_ID'],
    endpoints: [
      { method: 'POST', path: '/checkouts', desc: 'Initialize checkout / Apple Pay session' },
      { method: 'GET', path: '/checkouts/{id}/registration', desc: 'Get saved card by token' },
      { method: 'POST', path: '/registrations/{id}/payments', desc: 'Pay with saved card / guest card' },
      { method: 'GET', path: '/payments/{id}', desc: 'Check payment status' },
      { method: 'POST', path: '/payments/{id}', desc: 'Refund payment' },
      { method: 'POST', path: '/payments', desc: 'Apple Pay payment' },
    ],
    files: ['alpha-muvi-payment-main/src/shared/hyperPay/hyperPay.service.ts (717 lines)'],
    critical: true,
  },
  {
    id: 'payfort',
    name: 'PayFort / Amazon Payment Services',
    category: 'Payment Gateway',
    icon: '💳',
    purpose: 'Alternative payment gateway — card tokenization, purchases, status checks, refunds, Apple Pay with HMAC signature verification.',
    services: ['payment'],
    protocol: 'REST (HTTPS + HMAC Signature)',
    auth: 'HMAC SHA signature',
    envVars: ['PAYFORT_BASE_URL', 'PAYFORT_ACCESS_CODE', 'PAYFORT_MERCHANT_IDENTIFIER', 'PAYFORT_SHA_TYPE', 'PAYFORT_SHA_REQUEST_PHRASE', 'PAYFORT_SHA_RESPONSE_PHRASE'],
    endpoints: [
      { method: 'POST', path: '/ (CREATE_TOKEN)', desc: 'Create card token' },
      { method: 'POST', path: '/ (UPDATE_TOKEN)', desc: 'Update card token' },
      { method: 'POST', path: '/ (CHECK_STATUS)', desc: 'Check payment status' },
      { method: 'POST', path: '/ (PURCHASE)', desc: 'Process payment' },
      { method: 'POST', path: '/ (REFUND)', desc: 'Refund payment' },
      { method: 'POST', path: '/ (APPLE_PAY)', desc: 'Apple Pay digital wallet payment' },
    ],
    files: ['alpha-muvi-payment-main/src/shared/payfort/payfort.service.ts (410 lines)'],
    critical: true,
  },
  {
    id: 'checkout',
    name: 'Checkout.com',
    category: 'Payment Gateway + STC Pay',
    icon: '💳',
    purpose: 'Payment gateway with STC Pay integration — card payments, Apple Pay, customer management, instrument management, STC Pay via payment contexts, webhook event retrieval.',
    services: ['payment'],
    protocol: 'SDK (checkout-sdk-node)',
    auth: 'Secret Key + Primary Key',
    envVars: ['CHECKOUT_SECRET_KEY', 'CHECKOUT_PRIMARY_KEY', 'CHECKOUT_SUCCESS_END_POINT', 'CHECKOUT_FAILED_END_POINT'],
    endpoints: [
      { method: 'SDK', path: 'cko.tokens.request()', desc: 'Apple Pay token exchange' },
      { method: 'SDK', path: 'cko.payments.request()', desc: 'Process payment (card/STC Pay)' },
      { method: 'SDK', path: 'cko.payments.get()', desc: 'Get payment status / card info' },
      { method: 'SDK', path: 'cko.payments.refund()', desc: 'Refund payment' },
      { method: 'SDK', path: 'cko.customers.create()', desc: 'Create customer' },
      { method: 'SDK', path: 'cko.customers.get()', desc: 'Get customer' },
      { method: 'SDK', path: 'cko.customers.delete()', desc: 'Delete customer' },
      { method: 'SDK', path: 'cko.instruments.create()', desc: 'Add payment instrument' },
      { method: 'SDK', path: 'cko.paymentContexts.request()', desc: 'STC Pay session (source: "stcpay")' },
      { method: 'SDK', path: 'cko.workflows.getEvent()', desc: 'Retrieve webhook event' },
    ],
    files: ['alpha-muvi-payment-main/src/shared/checkout/checkout.service.ts (510 lines)'],
    critical: true,
  },
  {
    id: 'tabby',
    name: 'Tabby',
    category: 'Buy Now Pay Later',
    icon: '🛒',
    purpose: 'BNPL provider — create payment sessions, capture payments, check status, refunds.',
    services: ['payment'],
    protocol: 'REST (HTTPS)',
    auth: 'Bearer Token',
    envVars: ['TABBY_BASE_URL', 'TABBY_API_KEY', 'TABBY_MERCHANT_CODE', 'TABBY_CALLBACK_END_POINT'],
    endpoints: [
      { method: 'POST', path: '/checkout', desc: 'Create BNPL session' },
      { method: 'GET', path: '/payments/{id}', desc: 'Check payment status' },
      { method: 'POST', path: '/payments/{id}/captures', desc: 'Capture payment' },
      { method: 'POST', path: '/payments/{id}/refunds', desc: 'Refund payment' },
    ],
    files: ['alpha-muvi-payment-main/src/shared/tabby/tabby.service.ts (182 lines)'],
    critical: true,
  },
  {
    id: 'nearpay',
    name: 'NearPay',
    category: 'POS Terminal Payment',
    icon: '📱',
    purpose: 'In-cinema POS terminal payment — find terminals, generate JWT tokens for kiosk payment processing.',
    services: ['payment'],
    protocol: 'REST (HTTPS)',
    auth: 'API Key + RS256 JWT',
    envVars: ['NEARPAY_BASE_URL', 'NEARPAY_API_KEY', 'NEARPAY_PRIVATE_KEY', 'NEARPAY_CLIENT_UUID'],
    endpoints: [
      { method: 'GET', path: '/terminals/?tid={terminalId}', desc: 'Find terminal by ID' },
    ],
    files: ['alpha-muvi-payment-main/src/shared/nearpay/nearpay.service.ts'],
    critical: false,
  },
  {
    id: 'applepay',
    name: 'Apple Pay Session Validation',
    category: 'Payment',
    icon: '🍎',
    purpose: 'Validates Apple Pay merchant sessions with Apple servers using mutual TLS. Supports Checkout, PayFort, and HyperPay Apple Pay identifiers.',
    services: ['payment'],
    protocol: 'REST (mutual TLS)',
    auth: 'Client Certificate + Key',
    envVars: ['APPLE_PAY_DOMAIN_NAME', 'APPLE_PAY_VALIDATE_SESSION_URL'],
    endpoints: [
      { method: 'POST', path: '{appleUrl}', desc: 'Validate merchant session' },
    ],
    files: ['alpha-muvi-payment-main/src/shared/apple-pay-service/apple-pay.service.ts (89 lines)'],
    critical: true,
  },
  {
    id: 'unifonic',
    name: 'Unifonic',
    category: 'SMS / OTP',
    icon: '📲',
    purpose: 'Primary SMS OTP provider — sends OTP codes for phone verification during user login/registration.',
    services: ['identity'],
    protocol: 'REST (HTTPS)',
    auth: 'Bearer Token',
    envVars: ['UNIFONIC_URL', 'UNIFONIC_AUTH_TOKEN', 'UNIFONIC_APP_ID', 'UNIFONIC_CHANNEL', 'UNIFONIC_LENGTH'],
    endpoints: [
      { method: 'POST', path: '/verifications/start', desc: 'Send OTP' },
      { method: 'POST', path: '/verifications/check', desc: 'Verify OTP' },
    ],
    files: ['alpha-muvi-identity-main/src/shared/service/sms-gateways/unifonic.service.ts (177 lines)'],
    critical: true,
  },
  {
    id: 'taqnyat',
    name: 'Taqnyat',
    category: 'SMS / OTP',
    icon: '📲',
    purpose: 'Alternative SMS OTP provider — switchable with Unifonic via factory pattern. Sends OTP from "muviCinemas" sender.',
    services: ['identity'],
    protocol: 'REST (HTTPS)',
    auth: 'Bearer Token',
    envVars: ['TAQNYAT_URL', 'TAQNYAT_API_KEY', 'TAQNYAT_ANDROID_AUTOFILL_HASH'],
    endpoints: [
      { method: 'POST', path: '/verify.php/ (send)', desc: 'Send OTP via SMS' },
      { method: 'POST', path: '/verify.php/ (verify)', desc: 'Verify OTP with activeKey' },
    ],
    files: ['alpha-muvi-identity-main/src/shared/service/sms-gateways/taqnyat.service.ts (217 lines)'],
    critical: true,
  },
  {
    id: 'braze',
    name: 'Braze',
    category: 'Customer Engagement',
    icon: '📣',
    purpose: 'Customer engagement platform — sends targeted messages, tracks user profiles with segments (logged-in vs guest).',
    services: ['identity', 'notification'],
    protocol: 'REST (HTTPS)',
    auth: 'API Key',
    envVars: ['BRAZE_BASE_URL', 'BRAZE_API_KEY', 'BRAZE_LOGGED_IN_SEGMENT_ID', 'BRAZE_GUEST_SEGMENT_ID'],
    endpoints: [
      { method: 'POST', path: '/messages/send', desc: 'Send targeted messages' },
      { method: 'POST', path: '/users/track', desc: 'Update user profile / attributes' },
    ],
    files: [
      'alpha-muvi-identity-main/src/shared/braze/braze.service.ts',
      'alpha-muvi-notification-main/src/shared/braze/braze.service.ts',
    ],
    critical: false,
  },
  {
    id: 'onesignal',
    name: 'OneSignal',
    category: 'Push Notifications',
    icon: '🔔',
    purpose: 'Push notification delivery to mobile apps (iOS + Android + Huawei).',
    services: ['notification'],
    protocol: 'SDK (onesignal-api-client-nest)',
    auth: 'API Key + App ID',
    envVars: ['ONESIGNAL_API_KEY', 'ONESIGNAL_APP_ID'],
    endpoints: [
      { method: 'SDK', path: 'createNotification()', desc: 'Send push notification' },
    ],
    files: ['alpha-muvi-notification-main/src/notification/notification-providers/one-signal-notification.provider.ts'],
    critical: true,
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    category: 'Email',
    icon: '📧',
    purpose: 'Transactional email delivery — password reset, verification, booking confirmation, refund receipts, top-up receipts, survey emails, sync reports, bulk refund reports.',
    services: ['identity', 'notification', 'payment', 'fb', 'main'],
    protocol: 'SDK (@sendgrid/mail)',
    auth: 'API Key',
    envVars: ['SENDGRID_API_KEY', '+ 15+ template IDs per service'],
    endpoints: [
      { method: 'SDK', path: 'client.send()', desc: 'Send transactional email via template' },
    ],
    files: [
      'alpha-muvi-identity-main/src/shared/service/email/sendgrid-email.service.ts (233 lines)',
      'alpha-muvi-notification-main/src/shared/email/sendgrid-email.service.ts',
      'alpha-muvi-payment-main/src/shared/service/email/external-email.service.ts',
      'alpha-muvi-fb-main/src/shared/service/email/sendgrid-email.service.ts',
      'alpha-muvi-main-main/src/shared/service/email/sendgrid-email.service.ts',
    ],
    critical: true,
  },
  {
    id: 'aws-s3',
    name: 'AWS S3',
    category: 'File Storage',
    icon: '☁️',
    purpose: 'Object storage for uploaded images, files, Apple Wallet .pkpass files, and generated ticket images.',
    services: ['main', 'gateway', 'fb'],
    protocol: 'SDK (aws-sdk)',
    auth: 'Access Key + Secret',
    envVars: ['S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_BUCKET', 'S3_REGION'],
    endpoints: [
      { method: 'SDK', path: 'S3.upload()', desc: 'Upload file to bucket' },
    ],
    files: [
      'alpha-muvi-main-main/src/shared/files/file.service.ts (102 lines)',
      'alpha-muvi-gateway-main/src/files/file.service.ts',
      'alpha-muvi-fb-main/src/shared/files/files.service.ts',
    ],
    critical: true,
  },
  {
    id: 'aws-ssm',
    name: 'AWS SSM Parameter Store',
    category: 'Configuration',
    icon: '🔐',
    purpose: 'Loads environment configuration from AWS Parameter Store at service startup.',
    services: ['ALL 6 NestJS services'],
    protocol: 'SDK (@aws-sdk/client-ssm)',
    auth: 'Access Key + Secret',
    envVars: ['SSM_ACCESS_KEY_ID', 'SSM_SECRET_ACCESS_KEY', 'SSM_REGION'],
    endpoints: [
      { method: 'SDK', path: 'GetParametersByPathCommand', desc: 'Load config parameters' },
    ],
    files: ['src/shared/load-ssm-config.ts (in each service)'],
    critical: true,
  },
  {
    id: 'aws-lambda',
    name: 'AWS Lambda',
    category: 'Serverless',
    icon: '⚡',
    purpose: 'Invokes Lambda function to export finance reports asynchronously.',
    services: ['payment'],
    protocol: 'SDK (@aws-sdk/client-lambda)',
    auth: 'IAM / SDK credentials',
    envVars: ['EXPORT_FINANCE_REPORT_LAMBDA_FUNCTION_NAME'],
    endpoints: [
      { method: 'SDK', path: 'InvokeCommand', desc: 'Trigger finance report export' },
    ],
    files: ['alpha-muvi-payment-main/src/wallet-transaction/wallet-transaction.service.ts'],
    critical: false,
  },
  {
    id: 'cloudfront',
    name: 'AWS CloudFront',
    category: 'CDN',
    icon: '🌐',
    purpose: 'Serves uploaded assets (images, files) via CDN. S3 URLs are rewritten to CloudFront domain.',
    services: ['main', 'gateway'],
    protocol: 'URL rewrite',
    auth: 'N/A (public CDN)',
    envVars: ['CLOUDFRONT_DOMAIN'],
    endpoints: [],
    files: ['config/ files in main and gateway services'],
    critical: true,
  },
  {
    id: 'sentry',
    name: 'Sentry',
    category: 'Error Monitoring',
    icon: '🐛',
    purpose: 'Captures and reports runtime exceptions across all services for debugging.',
    services: ['ALL 7 services'],
    protocol: 'SDK (@sentry/node, sentry-go)',
    auth: 'DSN',
    envVars: ['SENTRY_DSN'],
    endpoints: [
      { method: 'SDK', path: 'Sentry.captureException()', desc: 'Report error to Sentry' },
    ],
    files: ['Exception filters and service methods in every service'],
    critical: true,
  },
  {
    id: 'datadog',
    name: 'Datadog',
    category: 'APM / Monitoring',
    icon: '📊',
    purpose: 'Application Performance Monitoring — distributed tracing, structured logging, metric collection.',
    services: ['ALL 7 services'],
    protocol: 'Agent (dd-trace, datadog-winston, dd-trace-go)',
    auth: 'API Key + Agent Host',
    envVars: ['DATADOG_API_KEY', 'DD_SITE', 'DD_SERVICE', 'DD_VERSION', 'DD_AGENT_HOST', 'DD_TRACE_AGENT_PORT'],
    endpoints: [],
    files: ['tracer.ts in each NestJS service, dd-trace-go in offer service'],
    critical: true,
  },
  {
    id: 'google-maps',
    name: 'Google Maps / Geocoding',
    category: 'Location',
    icon: '📍',
    purpose: 'Reverse geocoding — resolves city name from user GPS coordinates for cinema proximity.',
    services: ['main'],
    protocol: 'SDK (node-geocoder)',
    auth: 'API Key',
    envVars: ['GOOGLE_API_KEY'],
    endpoints: [
      { method: 'SDK', path: 'geocoder.reverse({ lat, lon })', desc: 'Reverse geocode coordinates to city' },
    ],
    files: ['alpha-muvi-main-main/src/city/city.service.ts'],
    critical: false,
  },
  {
    id: 'zatca',
    name: 'ZATCA (Saudi Tax Authority)',
    category: 'Tax Compliance',
    icon: '🏛️',
    purpose: 'Generates ZATCA-compliant QR codes for Saudi e-invoicing on movie tickets and F&B orders.',
    services: ['main', 'fb'],
    protocol: 'Library (@axenda/zatca)',
    auth: 'N/A (local generation)',
    envVars: ['ZATCA_SELLER_NAME'],
    endpoints: [
      { method: 'LIB', path: 'Invoice.toBase64()', desc: 'Generate ZATCA QR code' },
    ],
    files: [
      'alpha-muvi-main-main/src/orders/kiosk-order.service.ts',
      'alpha-muvi-fb-main/src/shared/service/invoice.service.ts',
    ],
    critical: true,
  },
  {
    id: 'unipal',
    name: 'UniPal',
    category: 'Student Verification',
    icon: '🎓',
    purpose: 'Verifies student eligibility for discounted tickets and confirms discount transactions.',
    services: ['offer'],
    protocol: 'REST (HTTPS)',
    auth: 'API Key Header',
    envVars: ['UNIPAL_BASE_URL', 'UNIPAL_API_KEY'],
    endpoints: [
      { method: 'GET', path: '/business/check-eligibility?code=&phone=', desc: 'Verify student status' },
      { method: 'POST', path: '/business/transactions/confirm', desc: 'Confirm discount transaction' },
    ],
    files: ['alpha-muvi-offer/src/unipal/unipal.service.go'],
    critical: false,
  },
  {
    id: 'apple-wallet',
    name: 'Apple Wallet (PassKit)',
    category: 'Digital Passes',
    icon: '🎟️',
    purpose: 'Generates Apple Wallet .pkpass files for movie tickets, uploaded to S3.',
    services: ['main'],
    protocol: 'Library (@walletpass/pass-js)',
    auth: 'Apple Certificates (WWDRCAG4 + signing cert)',
    envVars: ['APPLE_WALLET_PASS_TYPE_IDENTIFIER', 'APPLE_WALLET_TEAM_IDENTIFIER', 'APPLE_WALLET_CER_FILE_NAME'],
    endpoints: [
      { method: 'LIB', path: 'passGenerator.createPass()', desc: 'Create .pkpass file' },
    ],
    files: ['alpha-muvi-main-main/src/orders/order.service.ts (~line 1480-1618)'],
    critical: false,
  },
  {
    id: 'puppeteer',
    name: 'Puppeteer (Headless Chrome)',
    category: 'Rendering',
    icon: '🖼️',
    purpose: 'Renders HTML templates (EJS) to images for ticket generation, then uploads to S3.',
    services: ['main'],
    protocol: 'Library (puppeteer)',
    auth: 'N/A (local rendering)',
    envVars: [],
    endpoints: [
      { method: 'LIB', path: 'page.screenshot()', desc: 'Render HTML to image' },
    ],
    files: ['alpha-muvi-main-main/src/shared/files/file.service.ts'],
    critical: false,
  },
];

const cronJobs = [
  // External cron endpoints (AWS EventBridge → Gateway)
  {
    id: 'cron-sync-cinemas',
    name: 'Sync Cinemas from Vista',
    type: 'External Cron → HTTP',
    category: 'Vista Sync',
    icon: '🏢',
    trigger: 'AWS EventBridge / CloudWatch',
    endpoint: 'POST cms/cinemas/cron-sync',
    service: 'gateway → main',
    purpose: 'Fetches all cinema data from Vista OData API and upserts into local database.',
    file: 'alpha-muvi-gateway-main/src/main/controllers/cms-cinema.controller.ts',
    guard: 'AWSAuthGuard',
  },
  {
    id: 'cron-sync-films',
    name: 'Sync Films from Vista',
    type: 'External Cron → HTTP',
    category: 'Vista Sync',
    icon: '🎬',
    trigger: 'AWS EventBridge / CloudWatch',
    endpoint: 'POST cms/films/cron-sync',
    service: 'gateway → main',
    purpose: 'Fetches all film data from Vista OData API and upserts into local database.',
    file: 'alpha-muvi-gateway-main/src/main/controllers/cms-film.controller.ts',
    guard: 'AWSAuthGuard',
  },
  {
    id: 'cron-sync-sessions',
    name: 'Sync Film Sessions from Vista',
    type: 'External Cron → HTTP',
    category: 'Vista Sync',
    icon: '🗓️',
    trigger: 'AWS EventBridge / CloudWatch',
    endpoint: 'POST cms/film-sessions/cron-sync',
    service: 'gateway → main',
    purpose: 'Syncs film showtimes/sessions including availability, pricing, and cinema assignments.',
    file: 'alpha-muvi-gateway-main/src/main/controllers/cms-film-session.controller.ts',
    guard: 'AWSAuthGuard',
  },
  {
    id: 'cron-sync-genres',
    name: 'Sync Genres from Vista',
    type: 'External Cron → HTTP',
    category: 'Vista Sync',
    icon: '🏷️',
    trigger: 'AWS EventBridge / CloudWatch',
    endpoint: 'POST cms/genres/cron-sync',
    service: 'gateway → main',
    purpose: 'Fetches film genres from Vista and upserts locally.',
    file: 'alpha-muvi-gateway-main/src/main/controllers/cms-genre.controller.ts',
    guard: 'AWSAuthGuard',
  },
  {
    id: 'cron-sync-people',
    name: 'Sync People (Cast/Crew) from Vista',
    type: 'External Cron → HTTP',
    category: 'Vista Sync',
    icon: '👤',
    trigger: 'AWS EventBridge / CloudWatch',
    endpoint: 'POST cms/people/cron-sync',
    service: 'gateway → main',
    purpose: 'Syncs actors, directors, and crew members from Vista.',
    file: 'alpha-muvi-gateway-main/src/main/controllers/cms-person.controller.ts',
    guard: 'AWSAuthGuard',
  },
  {
    id: 'cron-sync-concessions',
    name: 'Sync F&B Concessions from Vista',
    type: 'External Cron → HTTP',
    category: 'Vista Sync',
    icon: '🍿',
    trigger: 'AWS EventBridge / CloudWatch',
    endpoint: 'POST cms/concession-tabs/cron-sync',
    service: 'gateway → fb',
    purpose: 'Syncs food & beverage tabs, items, modifiers, packages from Vista per-cinema (with 10s/5s delays).',
    file: 'alpha-muvi-gateway-main/src/fb/controllers/cms-concession-tab.controller.ts',
    guard: 'AWSAuthGuard',
  },
  {
    id: 'cron-cancel-expired-orders',
    name: 'Cancel Expired Orders',
    type: 'External Cron → HTTP',
    category: 'Order Lifecycle',
    icon: '⏰',
    trigger: 'AWS EventBridge / CloudWatch',
    endpoint: 'POST cms/orders/cron-cancel-expired',
    service: 'gateway → main',
    purpose: 'Finds orders past expiry, cancels them in Vista, marks as EXPIRED in DB, triggers payment cancellation.',
    file: 'alpha-muvi-gateway-main/src/main/controllers/cms-order.controller.ts',
    guard: 'AWSAuthGuard',
  },
  {
    id: 'cron-cancel-expired-topups',
    name: 'Cancel Expired Top-Ups',
    type: 'External Cron → HTTP',
    category: 'Order Lifecycle',
    icon: '💰',
    trigger: 'AWS EventBridge / CloudWatch',
    endpoint: 'POST cms/top-ups/cron-cancel-expired',
    service: 'gateway → payment',
    purpose: 'Cancels pending wallet top-up requests that have passed their expireAt deadline.',
    file: 'alpha-muvi-gateway-main/src/payment/controllers/cms-top-up.controller.ts',
    guard: 'AWSAuthGuard',
  },
  {
    id: 'cron-reminder-order',
    name: 'Order Reminder Notifications',
    type: 'External Cron → HTTP',
    category: 'Notifications',
    icon: '🔔',
    trigger: 'AWS EventBridge / CloudWatch',
    endpoint: 'POST cms/orders/cron-reminder-order',
    service: 'gateway → main → notification',
    purpose: 'Sends push notifications reminding users about upcoming movie bookings.',
    file: 'alpha-muvi-gateway-main/src/main/controllers/cms-order.controller.ts',
    guard: 'AWSAuthGuard',
  },
  {
    id: 'cron-survey-notification',
    name: 'Post-Movie Survey Push',
    type: 'External Cron → HTTP',
    category: 'Notifications',
    icon: '📋',
    trigger: 'AWS EventBridge / CloudWatch',
    endpoint: 'POST cms/orders/cron-survey-notification',
    service: 'gateway → main',
    purpose: 'Sends post-movie survey push notifications to users after their showtime.',
    file: 'alpha-muvi-gateway-main/src/main/controllers/cms-order.controller.ts',
    guard: 'AWSAuthGuard',
  },
  {
    id: 'cron-survey-email',
    name: 'Post-Movie Survey Email',
    type: 'External Cron → HTTP',
    category: 'Notifications',
    icon: '📧',
    trigger: 'AWS EventBridge / CloudWatch',
    endpoint: 'POST cms/orders/cron-survey-email',
    service: 'gateway → main',
    purpose: 'Sends post-movie survey emails to users.',
    file: 'alpha-muvi-gateway-main/src/main/controllers/cms-order.controller.ts',
    guard: 'AWSAuthGuard',
  },
  {
    id: 'cron-wallet-reminder',
    name: 'Wallet Expiry Reminders',
    type: 'External Cron → HTTP',
    category: 'Notifications',
    icon: '⏳',
    trigger: 'AWS EventBridge / CloudWatch',
    endpoint: 'POST cms/wallet-transactions/cron-reminder-expired',
    service: 'gateway → payment',
    purpose: 'Sends reminder notifications for wallet balances about to expire.',
    file: 'alpha-muvi-gateway-main/src/payment/controllers/cms-wallet-transaction.ctontroller.ts',
    guard: 'AWSAuthGuard',
  },
  {
    id: 'cron-wallet-process-expired',
    name: 'Process Expired Wallet Balances',
    type: 'External Cron → HTTP',
    category: 'Order Lifecycle',
    icon: '💸',
    trigger: 'AWS EventBridge / CloudWatch',
    endpoint: 'POST cms/wallet-transactions/process-expired',
    service: 'gateway → payment',
    purpose: 'Processes expired wallet transactions — zeroes out expired balances.',
    file: 'alpha-muvi-gateway-main/src/payment/controllers/cms-wallet-transaction.ctontroller.ts',
    guard: 'AWSAuthGuard',
  },
  {
    id: 'cron-delete-notifications',
    name: 'Delete Old Notifications',
    type: 'External Cron → HTTP',
    category: 'Cleanup',
    icon: '🗑️',
    trigger: 'AWS EventBridge / CloudWatch',
    endpoint: 'POST notifications/cron-delete-old-notifications',
    service: 'gateway → notification',
    purpose: 'Batch-deletes notifications older than NOTIFICATIONS_LIFESPAN_DAYS.',
    file: 'alpha-muvi-gateway-main/src/notification/controllers/notification.controller.ts',
    guard: 'AWSAuthGuard',
  },
  {
    id: 'cron-remove-expired-bookmarks',
    name: 'Remove Expired Bookmarks',
    type: 'External Cron → HTTP',
    category: 'Cleanup',
    icon: '🔖',
    trigger: 'AWS EventBridge / CloudWatch',
    endpoint: 'POST cms/films/remove-expired-bookmark',
    service: 'gateway → main',
    purpose: 'Removes bookmarks for films no longer showing in any cinema.',
    file: 'alpha-muvi-gateway-main/src/main/controllers/cms-film.controller.ts',
    guard: 'AWSAuthGuard',
  },
];

const queues = [
  {
    id: 'device-token-queue',
    name: 'Device Token Queue',
    queueName: 'device-token-queue',
    service: 'identity',
    icon: '📱',
    purpose: 'Batch-inserts push notification device tokens into the DB. Accumulates tokens in-memory, flushes every 10 seconds (setInterval) in batches of 300.',
    trigger: 'setInterval(10s) + on-demand registration',
    processes: ['add-device-token'],
    retry: 'N/A',
    files: [
      'alpha-muvi-identity-main/src/user/device-token/device-token.processor.ts',
      'alpha-muvi-identity-main/src/user/device-token/device-token.service.ts',
    ],
  },
  {
    id: 'e-wallet-queue',
    name: 'E-Wallet Queue',
    queueName: 'E_WALLET_QUEUE',
    service: 'payment',
    icon: '💰',
    purpose: 'Processes all wallet operations asynchronously via 4 dedicated process handlers.',
    trigger: 'On-demand (triggered by wallet actions)',
    processes: ['ADD_TOP_UP', 'REFUND', 'EARNED_BOOKING_CASHBACK', 'EARNED_CAMPAIGN_CASHBACK'],
    retry: 'Re-enqueue with 10 min delay on failure',
    files: [
      'alpha-muvi-payment-main/src/wallet-transaction/wallet-queue/wallet.processor.ts',
      'alpha-muvi-payment-main/src/wallet-transaction/wallet-queue/wallet-queue.service.ts',
    ],
  },
  {
    id: 'refund-queue',
    name: 'Refund Queue',
    queueName: 'refund-queue',
    service: 'payment',
    icon: '🔄',
    purpose: 'Processes payment refunds — checks payment status with gateway, cancels Vista order if needed, issues refund. Delay = expireAt minus now.',
    trigger: 'On-demand (delay = time until payment expires)',
    processes: ['refund'],
    retry: 'Fixed backoff: 10 min delay',
    files: [
      'alpha-muvi-payment-main/src/payment/refund queue/refund.processor.ts',
      'alpha-muvi-payment-main/src/payment/refund queue/refund-queue.service.ts',
    ],
  },
  {
    id: 'webhook-queue',
    name: 'Webhook Queue',
    queueName: 'webhook-queue',
    service: 'payment',
    icon: '🔗',
    purpose: 'Processes payment webhooks — confirms booking after payment callback from gateways. Hardcoded 10-second delay before processing.',
    trigger: 'On-demand (10s delay)',
    processes: ['webhook'],
    retry: 'N/A',
    files: [
      'alpha-muvi-payment-main/src/payment/webhook queue/webhook.processor.ts',
      'alpha-muvi-payment-main/src/payment/webhook queue/webhook-queue.service.ts',
    ],
  },
  {
    id: 'generate-ticket-queue',
    name: 'Generate Ticket Queue',
    queueName: 'generate-ticket-queue',
    service: 'payment (enqueue) → main (process)',
    icon: '🎫',
    purpose: 'Generates tickets after successful payment. Cross-service: payment enqueues, main service processes. Retries up to 3 times with exponential delay; triggers manual refund after 3 failures.',
    trigger: 'On-demand (after payment success)',
    processes: ['generate-ticket'],
    retry: 'Up to 3 retries with exponential delay',
    files: [
      'alpha-muvi-payment-main/src/payment/generate ticket queue/generate-ticket-queue.service.ts',
      'alpha-muvi-main-main/src/orders/generate ticket queue/generate-ticket.processor.ts',
    ],
  },
  {
    id: 'bulk-refund-queue',
    name: 'Bulk Refund Queue',
    queueName: 'bulk-refund-queue',
    service: 'main',
    icon: '📦',
    purpose: 'Processes CMS-triggered bulk refund requests — cancels Vista orders and processes payment refunds for multiple bookings at once.',
    trigger: 'On-demand (CMS action)',
    processes: ['bulk-refund'],
    retry: 'N/A',
    files: [
      'alpha-muvi-main-main/src/refund-payment-requests/bulk-refund-queue/bulk-refund-queue.processor.ts',
      'alpha-muvi-main-main/src/refund-payment-requests/bulk-refund-queue/bulk-refund-queue.service.ts',
    ],
  },
];

const cliSyncJobs = [
  {
    id: 'vista-sync-main',
    name: 'Vista Sync CLI (Main)',
    service: 'main',
    command: 'vista-sync',
    options: '-a (all), -c (cinemas), -f (films), -g (genres), -s (sessions), -p (people)',
    purpose: 'Full sync of all core Vista data. Run as external containerized job (Docker / K8s CronJob / ECS Task).',
    entry: 'alpha-muvi-main-main/src/main-cli.ts',
    file: 'alpha-muvi-main-main/src/sync-job/sync-job.command.ts',
  },
  {
    id: 'vista-sync-fb',
    name: 'Vista Sync CLI (F&B)',
    service: 'fb',
    command: 'vista-sync',
    options: 'N/A',
    purpose: 'Full sync of F&B concession items from Vista per-cinema. Run as external containerized job.',
    entry: 'alpha-muvi-fb-main/src/main-cli.ts',
    file: 'alpha-muvi-fb-main/src/sync-job/sync-job.command.ts',
  },
];

// ─── HTML GENERATION ────────────────────────────────────────────────────────

function generateHTML() {
  const lines = [];
  const L = (s) => lines.push(s);

  L('<!DOCTYPE html>');
  L('<html lang="en">');
  L('<head>');
  L('<meta charset="UTF-8">');
  L('<meta name="viewport" content="width=device-width, initial-scale=1.0">');
  L('<title>Muvi Cinemas — Backend Audit Report</title>');
  L('<style>');
  L(getCSS());
  L('</style>');
  L('</head>');
  L('<body>');

  // HERO
  L('<header class="hero">');
  L('  <div class="hero-inner">');
  L('    <h1>Backend Audit Report</h1>');
  L('    <p class="subtitle">Third-Party Integrations, Cron Jobs, Queues & Background Tasks</p>');
  L('    <div class="hero-stats">');
  L('      <div class="stat-box"><span class="stat-num">' + thirdPartyIntegrations.length + '</span><span class="stat-label">Third-Party Services</span></div>');
  L('      <div class="stat-box"><span class="stat-num">' + cronJobs.length + '</span><span class="stat-label">Scheduled Cron Jobs</span></div>');
  L('      <div class="stat-box"><span class="stat-num">' + queues.length + '</span><span class="stat-label">Bull Queues</span></div>');
  L('      <div class="stat-box"><span class="stat-num">' + cliSyncJobs.length + '</span><span class="stat-label">CLI Sync Jobs</span></div>');
  L('      <div class="stat-box"><span class="stat-num">7</span><span class="stat-label">Microservices</span></div>');
  L('    </div>');
  L('  </div>');
  L('</header>');

  // Architecture note
  L('<section class="arch-note">');
  L('  <div class="container">');
  L('    <div class="note-card">');
  L('      <h3>Key Architectural Observation</h3>');
  L('      <p>This backend uses <strong>zero @nestjs/schedule decorators</strong> (<code>@Cron</code>, <code>@Interval</code>, <code>@Timeout</code>). All recurring scheduling is handled <strong>externally</strong> via AWS EventBridge/CloudWatch calling <code>AWSAuthGuard</code>-protected HTTP endpoints, or external container orchestration (K8s CronJob / ECS Task) running CLI sync commands.</p>');
  L('    </div>');
  L('  </div>');
  L('</section>');

  // TOC
  L('<nav class="toc">');
  L('  <div class="container">');
  L('    <h2>Table of Contents</h2>');
  L('    <div class="toc-grid">');
  L('      <a href="#integrations" class="toc-item"><span class="toc-icon">🔌</span>Part I — Third-Party Integrations (' + thirdPartyIntegrations.length + ')</a>');
  L('      <a href="#cron-jobs" class="toc-item"><span class="toc-icon">⏱️</span>Part II — Scheduled Cron Jobs (' + cronJobs.length + ')</a>');
  L('      <a href="#queues" class="toc-item"><span class="toc-icon">📥</span>Part III — Bull Queues (' + queues.length + ')</a>');
  L('      <a href="#cli-sync" class="toc-item"><span class="toc-icon">🔄</span>Part IV — CLI Sync Jobs (' + cliSyncJobs.length + ')</a>');
  L('      <a href="#service-matrix" class="toc-item"><span class="toc-icon">📋</span>Part V — Service Matrix</a>');
  L('    </div>');
  L('  </div>');
  L('</nav>');

  // ─── PART I: INTEGRATIONS ─────────────────────────────────────
  L('<section id="integrations" class="section">');
  L('  <div class="container">');
  L('    <h2 class="section-title"><span class="section-num">I</span>Third-Party Integrations</h2>');
  L('    <p class="section-desc">All external APIs, SDKs, and services called by the backend microservices. ' + thirdPartyIntegrations.length + ' unique services identified.</p>');

  // Group by category
  const categories = {};
  thirdPartyIntegrations.forEach(i => {
    if (!categories[i.category]) categories[i.category] = [];
    categories[i.category].push(i);
  });

  Object.entries(categories).forEach(([cat, items]) => {
    L('    <h3 class="cat-heading">' + cat + '</h3>');
    items.forEach(item => {
      L('    <div class="integration-card" id="int-' + item.id + '">');
      L('      <div class="card-header">');
      L('        <span class="card-icon">' + item.icon + '</span>');
      L('        <div class="card-title-wrap">');
      L('          <h4>' + item.name + '</h4>');
      L('          <div class="badges">');
      const svcList = Array.isArray(item.services) ? item.services : [item.services];
      svcList.forEach(s => {
        L('            <span class="badge svc-badge">' + s + '</span>');
      });
      if (item.critical) L('            <span class="badge critical-badge">Critical</span>');
      L('          </div>');
      L('        </div>');
      L('      </div>');
      L('      <p class="card-purpose">' + item.purpose + '</p>');

      L('      <div class="card-details">');
      L('        <div class="detail-row"><span class="detail-label">Protocol</span><span class="detail-value">' + item.protocol + '</span></div>');
      L('        <div class="detail-row"><span class="detail-label">Auth</span><span class="detail-value">' + item.auth + '</span></div>');
      if (item.envVars && item.envVars.length > 0) {
        L('        <div class="detail-row"><span class="detail-label">Env Vars</span><span class="detail-value env-vars">' + item.envVars.map(e => '<code>' + e + '</code>').join(' ') + '</span></div>');
      }
      L('      </div>');

      if (item.endpoints && item.endpoints.length > 0) {
        L('      <div class="endpoints-table">');
        L('        <table>');
        L('          <thead><tr><th>Method</th><th>Endpoint / Call</th><th>Purpose</th></tr></thead>');
        L('          <tbody>');
        item.endpoints.forEach(ep => {
          const methodClass = ep.method === 'GET' ? 'method-get' : ep.method === 'POST' ? 'method-post' : 'method-sdk';
          L('            <tr><td><span class="method ' + methodClass + '">' + ep.method + '</span></td><td class="ep-path">' + ep.path + '</td><td>' + ep.desc + '</td></tr>');
        });
        L('          </tbody>');
        L('        </table>');
        L('      </div>');
      }

      if (item.files && item.files.length > 0) {
        L('      <div class="file-list">');
        item.files.forEach(f => {
          L('        <span class="file-path">📄 ' + f + '</span>');
        });
        L('      </div>');
      }

      L('    </div>');
    });
  });

  L('  </div>');
  L('</section>');

  // ─── PART II: CRON JOBS ──────────────────────────────────────
  L('<section id="cron-jobs" class="section section-alt">');
  L('  <div class="container">');
  L('    <h2 class="section-title"><span class="section-num">II</span>Scheduled Cron Jobs</h2>');
  L('    <p class="section-desc">All ' + cronJobs.length + ' recurring scheduled tasks triggered via AWS EventBridge/CloudWatch → Gateway HTTP endpoints protected by <code>AWSAuthGuard</code>.</p>');

  const cronCategories = {};
  cronJobs.forEach(c => {
    if (!cronCategories[c.category]) cronCategories[c.category] = [];
    cronCategories[c.category].push(c);
  });

  Object.entries(cronCategories).forEach(([cat, items]) => {
    L('    <h3 class="cat-heading">' + cat + ' (' + items.length + ')</h3>');
    L('    <div class="cron-grid">');
    items.forEach(item => {
      L('      <div class="cron-card">');
      L('        <div class="cron-header">');
      L('          <span class="cron-icon">' + item.icon + '</span>');
      L('          <h4>' + item.name + '</h4>');
      L('        </div>');
      L('        <p class="cron-purpose">' + item.purpose + '</p>');
      L('        <div class="cron-details">');
      L('          <div class="cron-detail"><span class="cron-label">Endpoint</span><code>' + item.endpoint + '</code></div>');
      L('          <div class="cron-detail"><span class="cron-label">Route</span><span class="badge svc-badge">' + item.service + '</span></div>');
      L('          <div class="cron-detail"><span class="cron-label">Trigger</span>' + item.trigger + '</div>');
      L('          <div class="cron-detail"><span class="cron-label">Guard</span><code>' + item.guard + '</code></div>');
      L('        </div>');
      L('        <div class="file-list"><span class="file-path">📄 ' + item.file + '</span></div>');
      L('      </div>');
    });
    L('    </div>');
  });

  L('  </div>');
  L('</section>');

  // ─── PART III: QUEUES ────────────────────────────────────────
  L('<section id="queues" class="section">');
  L('  <div class="container">');
  L('    <h2 class="section-title"><span class="section-num">III</span>Bull Queues</h2>');
  L('    <p class="section-desc">All ' + queues.length + ' Redis-backed Bull queues with processors for asynchronous task processing.</p>');

  queues.forEach(q => {
    L('    <div class="queue-card">');
    L('      <div class="queue-header">');
    L('        <span class="queue-icon">' + q.icon + '</span>');
    L('        <div>');
    L('          <h4>' + q.name + '</h4>');
    L('          <span class="queue-name-badge">' + q.queueName + '</span>');
    L('          <span class="badge svc-badge">' + q.service + '</span>');
    L('        </div>');
    L('      </div>');
    L('      <p class="queue-purpose">' + q.purpose + '</p>');
    L('      <div class="queue-details">');
    L('        <div class="queue-detail"><span class="queue-label">Trigger</span>' + q.trigger + '</div>');
    L('        <div class="queue-detail"><span class="queue-label">Processes</span>' + q.processes.map(p => '<code>' + p + '</code>').join(', ') + '</div>');
    L('        <div class="queue-detail"><span class="queue-label">Retry</span>' + q.retry + '</div>');
    L('      </div>');
    L('      <div class="file-list">');
    q.files.forEach(f => {
      L('        <span class="file-path">📄 ' + f + '</span>');
    });
    L('      </div>');
    L('    </div>');
  });

  L('  </div>');
  L('</section>');

  // ─── PART IV: CLI SYNC ───────────────────────────────────────
  L('<section id="cli-sync" class="section section-alt">');
  L('  <div class="container">');
  L('    <h2 class="section-title"><span class="section-num">IV</span>CLI Sync Jobs (nest-commander)</h2>');
  L('    <p class="section-desc">Standalone CLI commands that can be run as containerized jobs (Docker, K8s CronJob, ECS Task) for full Vista data synchronization.</p>');

  cliSyncJobs.forEach(job => {
    L('    <div class="cli-card">');
    L('      <h4>🔄 ' + job.name + '</h4>');
    L('      <p>' + job.purpose + '</p>');
    L('      <div class="cli-details">');
    L('        <div class="cli-detail"><span class="cli-label">Command</span><code>' + job.command + '</code></div>');
    L('        <div class="cli-detail"><span class="cli-label">Options</span><code>' + job.options + '</code></div>');
    L('        <div class="cli-detail"><span class="cli-label">Service</span><span class="badge svc-badge">' + job.service + '</span></div>');
    L('      </div>');
    L('      <div class="file-list">');
    L('        <span class="file-path">📄 ' + job.entry + '</span>');
    L('        <span class="file-path">📄 ' + job.file + '</span>');
    L('      </div>');
    L('    </div>');
  });

  L('  </div>');
  L('</section>');

  // ─── PART V: SERVICE MATRIX ──────────────────────────────────
  L('<section id="service-matrix" class="section">');
  L('  <div class="container">');
  L('    <h2 class="section-title"><span class="section-num">V</span>Service Integration Matrix</h2>');
  L('    <p class="section-desc">Which service uses what — a cross-reference of all microservices and their third-party dependencies.</p>');

  const serviceMap = {
    'gateway': { label: 'Gateway', integrations: [], crons: 0, queues: 0 },
    'main': { label: 'Main', integrations: [], crons: 0, queues: 0 },
    'identity': { label: 'Identity', integrations: [], crons: 0, queues: 0 },
    'payment': { label: 'Payment', integrations: [], crons: 0, queues: 0 },
    'notification': { label: 'Notification', integrations: [], crons: 0, queues: 0 },
    'fb': { label: 'F&B', integrations: [], crons: 0, queues: 0 },
    'offer': { label: 'Offer (Go)', integrations: [], crons: 0, queues: 0 },
  };

  thirdPartyIntegrations.forEach(item => {
    const svcList = Array.isArray(item.services) ? item.services : [item.services];
    svcList.forEach(s => {
      const key = s.toLowerCase().replace('all 6 nestjs services', '').replace('all 7 services', '');
      if (key.includes('all')) {
        Object.keys(serviceMap).forEach(k => {
          if (k !== 'offer' || s.includes('7')) serviceMap[k].integrations.push(item.name);
        });
      } else if (serviceMap[key]) {
        serviceMap[key].integrations.push(item.name);
      }
    });
  });

  L('    <div class="matrix-table">');
  L('    <table>');
  L('      <thead><tr><th>Service</th><th>Third-Party Integrations</th><th>Count</th></tr></thead>');
  L('      <tbody>');
  Object.values(serviceMap).forEach(svc => {
    const unique = [...new Set(svc.integrations)];
    L('        <tr>');
    L('          <td><strong>' + svc.label + '</strong></td>');
    L('          <td>' + unique.join(', ') + '</td>');
    L('          <td class="count-cell">' + unique.length + '</td>');
    L('        </tr>');
  });
  L('      </tbody>');
  L('    </table>');
  L('    </div>');

  L('  </div>');
  L('</section>');

  // FOOTER
  L('<footer class="footer">');
  L('  <div class="container">');
  L('    <div class="footer-stats">');
  L('      <div class="footer-stat">' + thirdPartyIntegrations.length + ' External Services</div>');
  L('      <div class="footer-stat">' + cronJobs.length + ' Cron Jobs</div>');
  L('      <div class="footer-stat">' + queues.length + ' Bull Queues</div>');
  L('      <div class="footer-stat">' + cliSyncJobs.length + ' CLI Sync Jobs</div>');
  const totalEndpoints = thirdPartyIntegrations.reduce((sum, i) => sum + (i.endpoints ? i.endpoints.length : 0), 0);
  L('      <div class="footer-stat">' + totalEndpoints + ' External API Calls</div>');
  L('    </div>');
  L('    <p class="footer-note">Generated ' + new Date().toISOString().split('T')[0] + ' — Muvi Cinemas Backend Audit</p>');
  L('  </div>');
  L('</footer>');

  L('</body>');
  L('</html>');
  return lines.join('\n');
}

function getCSS() {
  return `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  :root {
    --bg: #0a0e1a; --bg2: #111827; --bg3: #1a2035; --bg4: #232a3e;
    --text: #e2e8f0; --text2: #94a3b8; --text3: #64748b;
    --accent: #818cf8; --accent2: #6366f1; --accent3: #4f46e5;
    --green: #34d399; --red: #f87171; --yellow: #fbbf24; --blue: #60a5fa; --purple: #a78bfa;
    --border: #1e293b; --radius: 12px;
  }
  body { font-family: 'Inter', -apple-system, system-ui, sans-serif; background: var(--bg); color: var(--text); line-height: 1.7; }
  .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
  code { background: var(--bg4); padding: 2px 7px; border-radius: 4px; font-size: 0.85em; color: var(--accent); font-family: 'JetBrains Mono', 'Fira Code', monospace; }

  /* Hero */
  .hero { background: linear-gradient(135deg, var(--accent3) 0%, #7c3aed 50%, #1e1b4b 100%); padding: 80px 0 60px; text-align: center; }
  .hero h1 { font-size: 3rem; font-weight: 800; letter-spacing: -1px; margin-bottom: 8px; }
  .subtitle { color: rgba(255,255,255,.75); font-size: 1.2rem; margin-bottom: 40px; }
  .hero-stats { display: flex; gap: 20px; justify-content: center; flex-wrap: wrap; }
  .stat-box { background: rgba(255,255,255,.12); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,.15); border-radius: var(--radius); padding: 20px 28px; min-width: 140px; }
  .stat-num { display: block; font-size: 2.2rem; font-weight: 800; color: #fff; }
  .stat-label { font-size: .8rem; color: rgba(255,255,255,.7); text-transform: uppercase; letter-spacing: 1px; }

  /* Architecture note */
  .arch-note { padding: 40px 0 0; }
  .note-card { background: linear-gradient(135deg, rgba(99,102,241,.15), rgba(124,58,237,.1)); border: 1px solid rgba(99,102,241,.3); border-radius: var(--radius); padding: 28px 32px; }
  .note-card h3 { color: var(--accent); margin-bottom: 8px; font-size: 1.1rem; }
  .note-card p { color: var(--text2); line-height: 1.8; }

  /* TOC */
  .toc { padding: 50px 0 30px; }
  .toc h2 { font-size: 1.4rem; margin-bottom: 20px; color: var(--text2); }
  .toc-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; }
  .toc-item { display: flex; align-items: center; gap: 12px; padding: 14px 20px; background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; text-decoration: none; color: var(--text); transition: all .2s; }
  .toc-item:hover { border-color: var(--accent); background: var(--bg3); }
  .toc-icon { font-size: 1.4rem; }

  /* Sections */
  .section { padding: 60px 0; }
  .section-alt { background: var(--bg2); }
  .section-title { font-size: 2rem; font-weight: 800; margin-bottom: 8px; display: flex; align-items: center; gap: 16px; }
  .section-num { display: inline-flex; align-items: center; justify-content: center; width: 42px; height: 42px; background: var(--accent3); border-radius: 10px; font-size: 1.1rem; color: #fff; flex-shrink: 0; }
  .section-desc { color: var(--text2); margin-bottom: 32px; font-size: 1.05rem; }
  .cat-heading { font-size: 1.3rem; color: var(--accent); margin: 32px 0 16px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }

  /* Integration cards */
  .integration-card { background: var(--bg3); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; margin-bottom: 16px; transition: border-color .2s; }
  .integration-card:hover { border-color: var(--accent); }
  .card-header { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 12px; }
  .card-icon { font-size: 2rem; }
  .card-title-wrap h4 { font-size: 1.2rem; font-weight: 700; }
  .badges { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
  .badge { padding: 2px 10px; border-radius: 20px; font-size: .75rem; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; }
  .svc-badge { background: rgba(96,165,250,.15); color: var(--blue); border: 1px solid rgba(96,165,250,.3); }
  .critical-badge { background: rgba(248,113,113,.15); color: var(--red); border: 1px solid rgba(248,113,113,.3); }
  .card-purpose { color: var(--text2); margin-bottom: 16px; }

  .card-details { display: grid; grid-template-columns: 1fr; gap: 6px; margin-bottom: 16px; }
  .detail-row { display: flex; gap: 12px; font-size: .9rem; }
  .detail-label { color: var(--text3); min-width: 80px; flex-shrink: 0; font-weight: 600; }
  .detail-value { color: var(--text); }
  .env-vars { display: flex; flex-wrap: wrap; gap: 4px; }
  .env-vars code { font-size: .78rem; }

  /* Endpoint tables */
  .endpoints-table { overflow-x: auto; margin-bottom: 12px; }
  .endpoints-table table { width: 100%; border-collapse: collapse; font-size: .88rem; }
  .endpoints-table th { background: var(--bg4); padding: 8px 12px; text-align: left; color: var(--text3); font-weight: 600; text-transform: uppercase; font-size: .75rem; letter-spacing: .5px; }
  .endpoints-table td { padding: 7px 12px; border-top: 1px solid var(--border); }
  .ep-path { font-family: 'JetBrains Mono', monospace; font-size: .83rem; color: var(--text); word-break: break-all; }
  .method { padding: 2px 8px; border-radius: 4px; font-size: .72rem; font-weight: 700; text-transform: uppercase; }
  .method-get { background: rgba(52,211,153,.15); color: var(--green); }
  .method-post { background: rgba(96,165,250,.15); color: var(--blue); }
  .method-sdk { background: rgba(167,139,250,.15); color: var(--purple); }

  .file-list { display: flex; flex-direction: column; gap: 2px; }
  .file-path { font-size: .82rem; color: var(--text3); font-family: 'JetBrains Mono', monospace; }

  /* Cron cards */
  .cron-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 16px; margin-bottom: 24px; }
  .cron-card { background: var(--bg3); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; transition: border-color .2s; }
  .cron-card:hover { border-color: var(--yellow); }
  .cron-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .cron-icon { font-size: 1.5rem; }
  .cron-header h4 { font-size: 1.05rem; }
  .cron-purpose { color: var(--text2); font-size: .9rem; margin-bottom: 12px; }
  .cron-details { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
  .cron-detail { display: flex; gap: 8px; font-size: .85rem; align-items: center; }
  .cron-label { color: var(--text3); font-weight: 600; min-width: 65px; }

  /* Queue cards */
  .queue-card { background: var(--bg3); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; margin-bottom: 16px; transition: border-color .2s; }
  .queue-card:hover { border-color: var(--green); }
  .queue-header { display: flex; align-items: center; gap: 14px; margin-bottom: 10px; }
  .queue-icon { font-size: 2rem; }
  .queue-header h4 { font-size: 1.15rem; }
  .queue-name-badge { background: var(--bg4); border: 1px solid var(--border); padding: 2px 10px; border-radius: 6px; font-family: monospace; font-size: .82rem; color: var(--green); margin-right: 6px; }
  .queue-purpose { color: var(--text2); margin-bottom: 14px; }
  .queue-details { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
  .queue-detail { display: flex; gap: 8px; font-size: .88rem; }
  .queue-label { color: var(--text3); font-weight: 600; min-width: 70px; }

  /* CLI cards */
  .cli-card { background: var(--bg3); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; margin-bottom: 16px; }
  .cli-card:hover { border-color: var(--purple); }
  .cli-card h4 { margin-bottom: 6px; }
  .cli-card p { color: var(--text2); margin-bottom: 14px; font-size: .95rem; }
  .cli-details { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
  .cli-detail { display: flex; gap: 8px; font-size: .88rem; }
  .cli-label { color: var(--text3); font-weight: 600; min-width: 80px; }

  /* Matrix table */
  .matrix-table { overflow-x: auto; }
  .matrix-table table { width: 100%; border-collapse: collapse; }
  .matrix-table th { background: var(--bg4); padding: 12px 16px; text-align: left; color: var(--text3); font-weight: 600; text-transform: uppercase; font-size: .78rem; letter-spacing: .5px; }
  .matrix-table td { padding: 12px 16px; border-top: 1px solid var(--border); font-size: .9rem; color: var(--text2); }
  .matrix-table td strong { color: var(--text); }
  .count-cell { color: var(--accent); font-weight: 700; text-align: center; }

  /* Footer */
  .footer { background: var(--bg); border-top: 1px solid var(--border); padding: 40px 0; text-align: center; }
  .footer-stats { display: flex; gap: 32px; justify-content: center; flex-wrap: wrap; margin-bottom: 16px; }
  .footer-stat { color: var(--accent); font-weight: 700; font-size: 1rem; }
  .footer-note { color: var(--text3); font-size: .85rem; }

  @media (max-width: 768px) {
    .hero h1 { font-size: 2rem; }
    .hero-stats { gap: 10px; }
    .stat-box { min-width: 100px; padding: 14px 16px; }
    .stat-num { font-size: 1.6rem; }
    .section-title { font-size: 1.5rem; }
    .cron-grid { grid-template-columns: 1fr; }
  }
  `;
}

// ─── MAIN ───────────────────────────────────────────────────────────────────
const html = generateHTML();
const outPath = path.join(__dirname, 'backend-audit.html');
fs.writeFileSync(outPath, html, 'utf8');
console.log('Generated: ' + outPath);
console.log('  Third-party integrations: ' + thirdPartyIntegrations.length);
console.log('  Cron jobs: ' + cronJobs.length);
console.log('  Bull queues: ' + queues.length);
console.log('  CLI sync jobs: ' + cliSyncJobs.length);
const totalEP = thirdPartyIntegrations.reduce((s, i) => s + (i.endpoints ? i.endpoints.length : 0), 0);
console.log('  Total external API calls: ' + totalEP);
