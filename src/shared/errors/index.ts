import type { FastifyInstance } from 'fastify';

export const errors = {
  VALIDATION_ERROR: [400, 'Invalid request.'],
  RECURRENCE_RANGE_INVALID: [400, 'Calendar range must contain 1 to 366 days, using valid local dates.'],
  RECURRENCE_PROJECTION_LIMIT: [409, 'Projection exceeds 500 eligible recurrence rules. Refine the filters.'],
  AUTH_MISSING_TOKEN: [401, 'Bearer access token required.'],
  AUTH_INVALID_TOKEN: [401, 'Invalid or expired access token.'],
  AUTH_UNAVAILABLE: [503, 'Identity verification temporarily unavailable.'],
  FORBIDDEN: [403, 'Request is not permitted.'],
  NOT_FOUND: [404, 'Resource not found.'],
  CONFLICT: [409, 'Resource conflict.'],
  DEBT_MANAGED_ACCOUNT: [409, 'Use the Debt Payment API for this managed debt account.'],
  DEBT_CANCEL_UNSAFE: [409, 'Only the latest active payment can be cancelled; archived debts are terminal.'],
  CARD_MANAGED_ACCOUNT: [409, 'Use the Card Purchase API for this managed credit account.'],
  CARD_SOURCE_NOT_ALLOWED: [409, 'A managed card cannot be the source of a transfer.'],
  CARD_CANCEL_UNSAFE: [409, 'Purchase correction is unavailable after invoice payments. Refunds are outside this module.'],
  CARD_TRACKING_CONFLICT: [409, 'Tracking start must follow the existing unmanaged account charges.'],
  PAYLOAD_TOO_LARGE: [413, 'Request body is too large.'],
  UNSUPPORTED_MEDIA_TYPE: [415, 'Content type is not supported.'],
  RATE_LIMITED: [429, 'Too many requests.'],
  NOT_READY: [503, 'Service is not ready.'],
  INTERNAL_ERROR: [500, 'Internal server error.'],
} as const;
export type ErrorCode = keyof typeof errors;
export class AppError extends Error {
  constructor(readonly code: ErrorCode) { super(errors[code][1]); }
}
export const errorBody = (code: ErrorCode, requestId: string) => ({ error: { code, message: errors[code][1], requestId } });

export function installErrors(app: FastifyInstance) {
  app.setNotFoundHandler((request, reply) => reply.code(404).send(errorBody('NOT_FOUND', request.id)));
  app.setErrorHandler((error: Error & { validation?: unknown; statusCode?: number; code?: string }, request, reply) => {
    let code: ErrorCode = 'INTERNAL_ERROR';
    if (error instanceof AppError) code = error.code;
    else if (error.validation || error.statusCode === 400) code = 'VALIDATION_ERROR';
    else if (error.statusCode === 413) code = 'PAYLOAD_TOO_LARGE';
    else if (error.statusCode === 415) code = 'UNSUPPORTED_MEDIA_TYPE';
    else if (error.statusCode === 429) code = 'RATE_LIMITED';
    else if (error.code === '23505') code = 'CONFLICT';
    const status = errors[code][0];
    if (status >= 500) request.log.error({ code, requestId: request.id }, 'request failed');
    if (status === 401) reply.header('www-authenticate', 'Bearer');
    return reply.code(status).send(errorBody(code, request.id));
  });
}
