import type { FastifyServerOptions } from 'fastify';

export const loggerOptions = {
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]',
      'authorization', 'password', 'token', 'access_token', 'refresh_token', 'DATABASE_URL',
      '*.password', '*.token', '*.access_token', '*.refresh_token', '*.DATABASE_URL'],
    censor: '[REDACTED]',
  },
  // Never serialize arbitrary request URLs, headers, bodies or database errors.
  serializers: {
    req: (request: { method: string }) => ({ method: request.method }),
    res: (reply: { statusCode: number }) => ({ statusCode: reply.statusCode }),
    err: () => ({ type: 'Error', message: 'Internal error details withheld', stack: '[REDACTED]' }),
  },
} satisfies Exclude<FastifyServerOptions['logger'], boolean | undefined>;
