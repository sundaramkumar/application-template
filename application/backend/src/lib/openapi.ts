import { z } from 'zod';
import type { DescribeRouteOptions, GenerateSpecOptions } from 'hono-openapi';

/* OpenAPI helpers. We keep the existing zValidator for runtime validation and
   *describe* routes separately with describeRoute(); request/response shapes are
   derived from the same shared Zod schemas via z.toJSONSchema so the docs can't
   drift from validation. (hono-openapi only auto-resolves resolver() schemas for
   its own validator()/responses; for plain describeRoute bodies we embed the
   converted JSON Schema directly — robust across versions.) */

type AnyZod = z.ZodType;

/** Convert a Zod schema to a plain OpenAPI-compatible JSON Schema object. */
export function jsonSchema(schema: AnyZod): Record<string, unknown> {
  // `io: 'input'` documents the request shape (pre-transform); zod 4 emits
  // draft-2020-12, which OpenAPI 3.1 consumes directly.
  const js = z.toJSONSchema(schema, { unrepresentable: 'any', io: 'input' }) as Record<string, unknown>;
  delete js.$schema;
  return js;
}

/** Build a JSON request-body spec fragment from a shared Zod schema. */
export function jsonBody(schema: AnyZod, description?: string): DescribeRouteOptions['requestBody'] {
  return {
    required: true,
    ...(description ? { description } : {}),
    content: { 'application/json': { schema: jsonSchema(schema) } },
  };
}

/** A simple JSON response with a description (and optional schema). */
export function jsonResponse(description: string, schema?: AnyZod): NonNullable<DescribeRouteOptions['responses']>[string] {
  return {
    description,
    ...(schema ? { content: { 'application/json': { schema: jsonSchema(schema) } } } : {}),
  };
}

export const SECURITY: Array<Record<string, string[]>> = [{ apiKey: [] }, { cookieAuth: [] }];

/** Top-level OpenAPI document metadata, security schemes, and tags. */
export const openApiDocumentation: GenerateSpecOptions['documentation'] = {
  openapi: '3.1.0',
  info: {
    title:       'Symatis CRM API',
    version:     '1.0.0',
    description: 'Authenticated REST API. Use a session cookie (browser) or an API key '
               + '(`Authorization: Bearer app_…` or `X-API-Key: app_…`). An API key inherits '
               + 'the permissions of the role it is bound to.',
  },
  servers: [{ url: '/api', description: 'API root' }],
  components: {
    securitySchemes: {
      apiKey:     { type: 'http', scheme: 'bearer', bearerFormat: 'app_<token>',
                    description: 'Send your API key as a Bearer token.' },
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'app_token',
                    description: 'Session cookie set by POST /auth/login.' },
    },
  },
  security: SECURITY,
  tags: [
    { name: 'Auth',     description: 'Login, logout, current principal.' },
    { name: 'Users',    description: 'User management.' },
    { name: 'Roles',    description: 'Roles and their permission matrices.' },
    { name: 'Audit',    description: 'Audit trail.' },
    { name: 'API Keys', description: 'Programmatic access credentials.' },
  ],
};
