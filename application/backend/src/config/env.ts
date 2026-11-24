import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET:   z.string().min(32, 'JWT_SECRET must be at least 32 chars'),
  PORT:         z.coerce.number().default(3000),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  NODE_ENV:     z.enum(['development', 'production', 'test']).default('development'),
  DB_POOL_MAX:  z.coerce.number().default(10),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}

export const env = validateEnv();
