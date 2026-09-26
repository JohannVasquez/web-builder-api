import { z } from 'zod';

// Un plazo en días; vacío cuenta como no definido, para que `DEMO_X=` en el .env no se lea
// como cero.
const days = (fallback: number, min: number): z.ZodType<number> =>
  z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.coerce.number().int().min(min).default(fallback),
  );

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
  IMAGE_MAX_WIDTH: z.coerce.number().int().positive().default(2000),
  // Sin default: un secreto de firma JWT no debería tener un valor "de
  // fábrica" que alguien olvide cambiar en producción.
  AUTH_JWT_SECRET: z.string().min(32),
  AUTH_TOKEN_TTL_HOURS: z.coerce.number().int().positive().default(168),
  // Base del enlace que se manda por correo para recuperar la contraseña (SPEC 9.1).
  ADMIN_PANEL_URL: z.string().min(1).default('http://localhost:3000/admin'),
  // Revalidación de la caché del frontend (SPEC 0.2); vacía = apagada.
  WEBAPP_REVALIDATE_URL: z.string().default(''),
  REVALIDATE_SECRET: z.string().default(''),
  // Dominio de la plataforma: sus subdominios se dan por verificados (SPEC 9.3).
  PLATFORM_DOMAIN: z.string().min(1).default('localhost'),
  // A dónde tiene que apuntar el DNS del dominio propio de un cliente.
  PLATFORM_SITE_TARGET: z.string().min(1).default('sitios.webbuilder.co'),
  // Catálogo de bloques y estilos: vive en el frontend, la API solo lo reexpone (SPEC 10.5).
  WEBAPP_CATALOG_URL: z.string().default(''),
  // Plazos de conservación en días (ver `scripts/purge-expired-data.ts`). Vacíos = los
  // valores por omisión del dominio.
  RETENTION_CONTACT_DAYS: z.string().default(''),
  RETENTION_SUBSCRIBER_DAYS: z.string().default(''),
  RETENTION_ORDER_DAYS: z.string().default(''),
  // Clave de 32 bytes en base64 con la que se cifran las credenciales de cobro de cada
  // tienda. Sin default: una clave "de fábrica" que alguien olvide cambiar deja las
  // credenciales tan expuestas como si no hubiera cifrado (mismo criterio que AUTH_JWT_SECRET).
  CREDENTIALS_ENCRYPTION_KEY: z
    .string()
    .min(
      1,
      'Falta CREDENTIALS_ENCRYPTION_KEY: con ella se cifran las credenciales de cobro de cada ' +
        'tienda. Genera una con `openssl rand -base64 32` y ponla en el .env. No tiene valor ' +
        'por omisión a propósito: una clave de fábrica deja las credenciales tan expuestas ' +
        'como si no hubiera cifrado.',
    ),
  // Claves retiradas, separadas por coma: solo descifran. Permiten rotar sin reescribir la
  // tabla entera de una vez.
  CREDENTIALS_ENCRYPTION_RETIRED_KEYS: z.string().default(''),
  // Sal para la huella de IP del registro de consentimiento. Vacía = no se guarda huella
  // alguna, que es preferible a guardar un sha256 de IP, reversible en segundos sin sal.
  CONSENT_IP_SALT: z.string().default(''),
  // Demos de prospecto (ver docs/demos.md): cuánto duran al crearlas y cuánto suma cada
  // extensión, y con cuánta anticipación entran en "por vencer".
  DEMO_DURATION_DAYS: days(14, 1),
  DEMO_EXPIRY_WARNING_DAYS: days(3, 0),
  // A dónde responde el prospecto el aviso de vencimiento. Vacío = CONTACT_EMAIL_FROM.
  DEMO_REPLY_TO: z.union([z.literal(''), z.email()]).default(''),
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
      IMAGE_MAX_WIDTH: source.IMAGE_MAX_WIDTH,
      AUTH_JWT_SECRET: source.AUTH_JWT_SECRET,
      AUTH_TOKEN_TTL_HOURS: source.AUTH_TOKEN_TTL_HOURS,
      ADMIN_PANEL_URL: source.ADMIN_PANEL_URL,
      WEBAPP_REVALIDATE_URL: source.WEBAPP_REVALIDATE_URL,
      REVALIDATE_SECRET: source.REVALIDATE_SECRET,
      WEBAPP_CATALOG_URL: source.WEBAPP_CATALOG_URL,
      RETENTION_CONTACT_DAYS: source.RETENTION_CONTACT_DAYS,
      RETENTION_SUBSCRIBER_DAYS: source.RETENTION_SUBSCRIBER_DAYS,
      RETENTION_ORDER_DAYS: source.RETENTION_ORDER_DAYS,
      CREDENTIALS_ENCRYPTION_KEY: source.CREDENTIALS_ENCRYPTION_KEY,
      CREDENTIALS_ENCRYPTION_RETIRED_KEYS: source.CREDENTIALS_ENCRYPTION_RETIRED_KEYS,
      PLATFORM_DOMAIN: source.PLATFORM_DOMAIN,
      PLATFORM_SITE_TARGET: source.PLATFORM_SITE_TARGET,
      CONSENT_IP_SALT: source.CONSENT_IP_SALT,
      DEMO_DURATION_DAYS: source.DEMO_DURATION_DAYS,
      DEMO_EXPIRY_WARNING_DAYS: source.DEMO_EXPIRY_WARNING_DAYS,
      DEMO_REPLY_TO: source.DEMO_REPLY_TO,
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
