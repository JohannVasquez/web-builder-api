import { z } from 'zod';

const envSchema = z.strictObject({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:3000'),
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
