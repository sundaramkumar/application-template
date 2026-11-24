export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code:   string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest  = (msg: string, details?: unknown) => new AppError(400, 'BAD_REQUEST',   msg, details);
export const unauthorized= (msg = 'Unauthorized')           => new AppError(401, 'UNAUTHORIZED',  msg);
export const forbidden   = (msg = 'Forbidden')              => new AppError(403, 'FORBIDDEN',     msg);
export const notFound    = (resource: string)               => new AppError(404, 'NOT_FOUND',     `${resource} not found`);
export const conflict    = (msg: string)                    => new AppError(409, 'CONFLICT',      msg);
export const uniqueConflict = (msg: string, field: string) => new AppError(409, 'UNIQUE_CONFLICT', msg, { field });
export const validationError = (details: unknown)           => new AppError(400, 'VALIDATION_ERROR', 'Invalid input', details);
