import { Type } from 'typebox';
import { errors } from '../errors/index.js';

export const Uuid = Type.String({ format: 'uuid' });
export const EmptyQuery = Type.Object({}, { additionalProperties: false });
export const ErrorResponse = Type.Object({ error: Type.Object({
  code: Type.Union(Object.keys(errors).map((code) => Type.Literal(code))), message: Type.String(), requestId: Type.String(),
}, { additionalProperties: false }) }, { additionalProperties: false });
export const ErrorResponses = Object.fromEntries([400, 401, 403, 404, 409, 413, 415, 429, 500, 503].map((status) => [status, ErrorResponse]));
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
