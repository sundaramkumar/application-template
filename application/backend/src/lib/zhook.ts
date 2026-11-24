import { validationError } from './errors';

// Shared @hono/zod-validator hook: turn validation failures into an AppError
// so the global error handler returns the standard error shape.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const zHook = (result: { success: boolean; error?: any }) => {
  if (!result.success) {
    throw validationError(result.error.flatten());
  }
};
