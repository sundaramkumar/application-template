import { z } from 'zod';

export const userStatusSchema = z.enum(['active', 'inactive']);

export const createUserSchema = z.object({
  username:  z.string().trim().min(1, 'Username is required').max(50),
  password:  z.string().min(6, 'Password must be at least 6 characters'),
  full_name: z.string().trim().min(1, 'Full name is required').max(100),
  email:     z.email('Invalid email').max(150),
  status:    userStatusSchema.optional(),
  role_id:   z.uuid().nullable().optional(),
});

// Update: every field optional (incl. password — blank = keep).
export const updateUserSchema = createUserSchema.partial();

export const changePasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
