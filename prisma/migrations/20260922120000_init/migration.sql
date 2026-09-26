-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_domains" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "domain" VARCHAR(255) NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pages" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "visual_style" VARCHAR(50),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_content" JSONB,
    "published_at" TIMESTAMPTZ,

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_sections" (
    "id" UUID NOT NULL,
    "page_id" UUID NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "position" INTEGER NOT NULL,
    "props" JSONB NOT NULL DEFAULT '{}',
    "anchor" VARCHAR(100),
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "page_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_versions" (
    "id" UUID NOT NULL,
    "page_id" UUID NOT NULL,
    "snapshot" JSONB NOT NULL,
    "summary" VARCHAR(255) NOT NULL,
    "actor_type" VARCHAR(20) NOT NULL,
    "actor_id" UUID,
    "actor_name" VARCHAR(255) NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "navigation_links" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "href" VARCHAR(255) NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "navigation_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage_assets" (
    "id" UUID NOT NULL,
    "key" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size" INTEGER NOT NULL,
    "tenant_id" UUID,
    "original_name" VARCHAR(255),
    "alt" VARCHAR(500),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "storage_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" VARCHAR(20) NOT NULL DEFAULT 'owner',
    "disabled_at" TIMESTAMPTZ,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_user_tenants" (
    "admin_user_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_user_tenants_pkey" PRIMARY KEY ("admin_user_id","tenant_id")
);

-- CreateTable
CREATE TABLE "tenant_brands" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "palette" JSONB NOT NULL DEFAULT '{}',
    "typography" JSONB NOT NULL DEFAULT '{}',
    "assets" JSONB NOT NULL DEFAULT '{}',
    "color_mode" VARCHAR(20) NOT NULL DEFAULT 'system',
    "visual_style" VARCHAR(50) NOT NULL DEFAULT 'classic',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_settings" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "global_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "prefix" VARCHAR(24) NOT NULL,
    "key_hash" VARCHAR(64) NOT NULL,
    "permission" VARCHAR(20) NOT NULL,
    "scope_all_tenants" BOOLEAN NOT NULL DEFAULT true,
    "rate_limit_per_minute" INTEGER NOT NULL DEFAULT 120,
    "created_by_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ,
    "last_used_at" TIMESTAMPTZ,
    "revoked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_key_tenants" (
    "api_key_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,

    CONSTRAINT "api_key_tenants_pkey" PRIMARY KEY ("api_key_id","tenant_id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "actor_type" VARCHAR(20) NOT NULL,
    "actor_id" UUID,
    "actor_name" VARCHAR(255) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" VARCHAR(100),
    "summary" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "message" TEXT NOT NULL,
    "emailed_at" TIMESTAMPTZ,
    "email_error" TEXT,
    "read_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_posts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "excerpt" TEXT NOT NULL,
    "cover_image_key" VARCHAR(500),
    "content" JSONB NOT NULL DEFAULT '[]',
    "author_name" VARCHAR(255) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMPTZ,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "seo_title" VARCHAR(255),
    "seo_description" TEXT,
    "og_image_key" VARCHAR(500),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "newsletter_subscribers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "confirmed_at" TIMESTAMPTZ,
    "unsubscribed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "image_keys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "price_cents" INTEGER NOT NULL,
    "sale_price_cents" INTEGER,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'CLP',
    "category_id" UUID,
    "variants" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "stock" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_resets" (
    "id" UUID NOT NULL,
    "admin_user_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_settings" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'CLP',
    "tax_included" BOOLEAN NOT NULL DEFAULT true,
    "tax_rate_percent" INTEGER NOT NULL DEFAULT 19,
    "shipping_options" JSONB NOT NULL DEFAULT '[]',
    "free_shipping_threshold_cents" INTEGER,
    "payment_provider" VARCHAR(20) NOT NULL DEFAULT 'none',
    "payment_credentials" JSONB NOT NULL DEFAULT '{}',
    "notification_email" VARCHAR(255),
    "terms_page_slug" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "discount_type" VARCHAR(20) NOT NULL,
    "value" INTEGER NOT NULL,
    "minimum_cents" INTEGER,
    "starts_at" TIMESTAMPTZ,
    "ends_at" TIMESTAMPTZ,
    "max_uses" INTEGER,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "number" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "customer_name" VARCHAR(160) NOT NULL,
    "customer_email" VARCHAR(255) NOT NULL,
    "customer_phone" VARCHAR(40) NOT NULL,
    "delivery_method" VARCHAR(20) NOT NULL,
    "address_line" VARCHAR(255),
    "address_city" VARCHAR(120),
    "address_region" VARCHAR(120),
    "address_notes" TEXT,
    "shipping_code" VARCHAR(40),
    "shipping_name" VARCHAR(120),
    "shipping_cents" INTEGER NOT NULL DEFAULT 0,
    "subtotal_cents" INTEGER NOT NULL,
    "discount_cents" INTEGER NOT NULL DEFAULT 0,
    "total_cents" INTEGER NOT NULL,
    "tax_cents" INTEGER NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'CLP',
    "coupon_code" VARCHAR(40),
    "terms_accepted_at" TIMESTAMPTZ,
    "terms_version" VARCHAR(40),
    "payment_provider" VARCHAR(20),
    "payment_reference" VARCHAR(255),
    "paid_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "product_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "variant" JSONB NOT NULL DEFAULT '{}',
    "unit_price_cents" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "total_cents" INTEGER NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "scope" VARCHAR(60) NOT NULL,
    "request_hash" VARCHAR(64) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'processing',
    "response_status" INTEGER,
    "response_body" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_domains_domain_key" ON "tenant_domains"("domain");

-- CreateIndex
CREATE INDEX "tenant_domains_tenant_id_idx" ON "tenant_domains"("tenant_id");

-- CreateIndex
CREATE INDEX "pages_tenant_id_idx" ON "pages"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "pages_tenant_id_slug_key" ON "pages"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "page_sections_page_id_idx" ON "page_sections"("page_id");

-- CreateIndex
CREATE UNIQUE INDEX "page_sections_page_id_position_key" ON "page_sections"("page_id", "position");

-- CreateIndex
CREATE INDEX "page_versions_page_id_created_at_idx" ON "page_versions"("page_id", "created_at");

-- CreateIndex
CREATE INDEX "navigation_links_tenant_id_idx" ON "navigation_links"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "navigation_links_tenant_id_position_key" ON "navigation_links"("tenant_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "storage_assets_key_key" ON "storage_assets"("key");

-- CreateIndex
CREATE INDEX "storage_assets_tenant_id_created_at_idx" ON "storage_assets"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "admin_user_tenants_tenant_id_idx" ON "admin_user_tenants"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_brands_tenant_id_key" ON "tenant_brands"("tenant_id");

-- CreateIndex
CREATE INDEX "global_settings_tenant_id_idx" ON "global_settings"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "global_settings_tenant_id_key_key" ON "global_settings"("tenant_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_prefix_key" ON "api_keys"("prefix");

-- CreateIndex
CREATE INDEX "api_keys_key_hash_idx" ON "api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "api_key_tenants_tenant_id_idx" ON "api_key_tenants"("tenant_id");

-- CreateIndex
CREATE INDEX "activity_logs_tenant_id_created_at_idx" ON "activity_logs"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "activity_logs_actor_type_actor_id_idx" ON "activity_logs"("actor_type", "actor_id");

-- CreateIndex
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs"("created_at");

-- CreateIndex
CREATE INDEX "contact_messages_tenant_id_created_at_idx" ON "contact_messages"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "blog_posts_tenant_id_status_published_at_idx" ON "blog_posts"("tenant_id", "status", "published_at");

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_tenant_id_slug_key" ON "blog_posts"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "newsletter_subscribers_tenant_id_created_at_idx" ON "newsletter_subscribers"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_subscribers_tenant_id_email_key" ON "newsletter_subscribers"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "product_categories_tenant_id_idx" ON "product_categories"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_tenant_id_slug_key" ON "product_categories"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "products_tenant_id_is_active_idx" ON "products"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "products_tenant_id_featured_idx" ON "products"("tenant_id", "featured");

-- CreateIndex
CREATE UNIQUE INDEX "products_tenant_id_slug_key" ON "products"("tenant_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_token_hash_key" ON "password_resets"("token_hash");

-- CreateIndex
CREATE INDEX "password_resets_admin_user_id_idx" ON "password_resets"("admin_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "store_settings_tenant_id_key" ON "store_settings"("tenant_id");

-- CreateIndex
CREATE INDEX "coupons_tenant_id_idx" ON "coupons"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_tenant_id_code_key" ON "coupons"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "orders_tenant_id_status_idx" ON "orders"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "orders_tenant_id_created_at_idx" ON "orders"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "orders_tenant_id_number_key" ON "orders"("tenant_id", "number");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "idempotency_keys_expires_at_idx" ON "idempotency_keys"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_tenant_id_scope_key_key" ON "idempotency_keys"("tenant_id", "scope", "key");

-- AddForeignKey
ALTER TABLE "tenant_domains" ADD CONSTRAINT "tenant_domains_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_sections" ADD CONSTRAINT "page_sections_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_versions" ADD CONSTRAINT "page_versions_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "navigation_links" ADD CONSTRAINT "navigation_links_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_assets" ADD CONSTRAINT "storage_assets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_user_tenants" ADD CONSTRAINT "admin_user_tenants_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_user_tenants" ADD CONSTRAINT "admin_user_tenants_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_brands" ADD CONSTRAINT "tenant_brands_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "global_settings" ADD CONSTRAINT "global_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_key_tenants" ADD CONSTRAINT "api_key_tenants_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_key_tenants" ADD CONSTRAINT "api_key_tenants_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "newsletter_subscribers" ADD CONSTRAINT "newsletter_subscribers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_settings" ADD CONSTRAINT "store_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

