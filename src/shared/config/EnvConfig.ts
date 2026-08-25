import { z } from 'zod';

const envSchema = z.strictObject({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  // Lista separada por comas: con multi-tenant cada dominio es un origen
  // distinto, así que un único valor bloquearía el formulario de contacto de
  // todos los tenants menos uno. Detrás de Caddy queda vacío de facto, porque
  // la API se sirve bajo el mismo host que la web y no hay cross-origin.
  CORS_ORIGIN: z
    .string()
    .min(1)
    .default('http://localhost:3000')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin !== ''),
    ),
  DATABASE_URL: z.string().min(1),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  CONTACT_EMAIL_FROM: z.email(),
  CONTACT_EMAIL_TO: z.email(),
  STORAGE_DRIVER: z.enum(['minio', 'r2']).default('minio'),
  STORAGE_ENDPOINT: z.string().min(1).default('http://localhost:9000'),
  STORAGE_REGION: z.string().min(1).default('auto'),
  STORAGE_BUCKET: z.string().min(1).default('web-builder-assets'),
  STORAGE_ACCESS_KEY: z.string().default(''),
  STORAGE_SECRET_KEY: z.string().default(''),
  MAX_FILE_SIZE_MB: z.coerce.number().int().positive().default(5),
  // Sin default: un secreto de firma JWT no debería tener un valor "de
  // fábrica" que alguien olvide cambiar en producción.
  AUTH_JWT_SECRET: z.string().min(32),
  AUTH_TOKEN_TTL_HOURS: z.coerce.number().int().positive().default(168),
});

export type EnvVariables = z.infer<typeof envSchema>;

export class EnvConfig {
  private constructor(private readonly variables: EnvVariables) {}

  public static load(source: NodeJS.ProcessEnv): EnvConfig {
    const candidate = {
      NODE_ENV: source.NODE_ENV,
      PORT: source.PORT,
      CORS_ORIGIN: source.CORS_ORIGIN,
      DATABASE_URL: source.DATABASE_URL,
      SMTP_HOST: source.SMTP_HOST,
      SMTP_PORT: source.SMTP_PORT,
      SMTP_SECURE: source.SMTP_SECURE,
      SMTP_USER: source.SMTP_USER,
      SMTP_PASS: source.SMTP_PASS,
      CONTACT_EMAIL_FROM: source.CONTACT_EMAIL_FROM,
      CONTACT_EMAIL_TO: source.CONTACT_EMAIL_TO,
      STORAGE_DRIVER: source.STORAGE_DRIVER,
      STORAGE_ENDPOINT: source.STORAGE_ENDPOINT,
      STORAGE_REGION: source.STORAGE_REGION,
      STORAGE_BUCKET: source.STORAGE_BUCKET,
      STORAGE_ACCESS_KEY: source.STORAGE_ACCESS_KEY,
      STORAGE_SECRET_KEY: source.STORAGE_SECRET_KEY,
      MAX_FILE_SIZE_MB: source.MAX_FILE_SIZE_MB,
      AUTH_JWT_SECRET: source.AUTH_JWT_SECRET,
      AUTH_TOKEN_TTL_HOURS: source.AUTH_TOKEN_TTL_HOURS,
    };
    const cleaned = Object.fromEntries(
      Object.entries(candidate).filter(([, value]) => value !== undefined),
    );
    return new EnvConfig(envSchema.parse(cleaned));
  }

  public get<K extends keyof EnvVariables>(key: K): EnvVariables[K] {
    return this.variables[key];
  }
}
