-- Custom migration: integer (serial) primary keys → UUID on every table, preserving data.
-- drizzle-kit's generated "ALTER COLUMN ... SET DATA TYPE uuid" cannot cast integers, so
-- each row gets a new UUID and every reference is remapped before the old columns go.
-- Existing rows get a UUID v7 stamped with their own created_at, so ids keep sorting in
-- creation order (new rows get v7 from the app; the DB default is v4 gen_random_uuid()).

CREATE FUNCTION pg_temp.uuid_v7_at(ts timestamp) RETURNS uuid AS $$
  SELECT encode(
    set_bit(set_bit(
      overlay(uuid_send(gen_random_uuid())
              PLACING substring(int8send(floor(extract(epoch FROM ts) * 1000)::bigint) FROM 3)
              FROM 1 FOR 6),
    52, 1), 53, 1),
  'hex')::uuid
$$ LANGUAGE sql VOLATILE;
--> statement-breakpoint

-- 1. New primary key values ------------------------------------------------------------
ALTER TABLE "roles"            ADD COLUMN "new_id" uuid;--> statement-breakpoint
ALTER TABLE "users"            ADD COLUMN "new_id" uuid;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD COLUMN "new_id" uuid;--> statement-breakpoint
ALTER TABLE "api_keys"         ADD COLUMN "new_id" uuid;--> statement-breakpoint
ALTER TABLE "audit_logs"       ADD COLUMN "new_id" uuid;--> statement-breakpoint
UPDATE "roles"            SET "new_id" = pg_temp.uuid_v7_at("created_at");--> statement-breakpoint
UPDATE "users"            SET "new_id" = pg_temp.uuid_v7_at("created_at");--> statement-breakpoint
UPDATE "role_permissions" SET "new_id" = pg_temp.uuid_v7_at("created_at");--> statement-breakpoint
UPDATE "api_keys"         SET "new_id" = pg_temp.uuid_v7_at("created_at");--> statement-breakpoint
UPDATE "audit_logs"       SET "new_id" = pg_temp.uuid_v7_at("created_at");--> statement-breakpoint

-- 2. Remap every reference to the new ids ----------------------------------------------
ALTER TABLE "users" ADD COLUMN "new_role_id" uuid, ADD COLUMN "new_created_by" uuid, ADD COLUMN "new_updated_by" uuid;--> statement-breakpoint
UPDATE "users" u SET "new_role_id"    = r."new_id" FROM "roles" r WHERE r."id" = u."role_id";--> statement-breakpoint
UPDATE "users" u SET "new_created_by" = x."new_id" FROM "users" x WHERE x."id" = u."created_by";--> statement-breakpoint
UPDATE "users" u SET "new_updated_by" = x."new_id" FROM "users" x WHERE x."id" = u."updated_by";--> statement-breakpoint

ALTER TABLE "roles" ADD COLUMN "new_created_by" uuid, ADD COLUMN "new_updated_by" uuid;--> statement-breakpoint
UPDATE "roles" r SET "new_created_by" = x."new_id" FROM "users" x WHERE x."id" = r."created_by";--> statement-breakpoint
UPDATE "roles" r SET "new_updated_by" = x."new_id" FROM "users" x WHERE x."id" = r."updated_by";--> statement-breakpoint

ALTER TABLE "role_permissions" ADD COLUMN "new_role_id" uuid;--> statement-breakpoint
UPDATE "role_permissions" p SET "new_role_id" = r."new_id" FROM "roles" r WHERE r."id" = p."role_id";--> statement-breakpoint

ALTER TABLE "api_keys" ADD COLUMN "new_role_id" uuid, ADD COLUMN "new_created_by" uuid;--> statement-breakpoint
UPDATE "api_keys" k SET "new_role_id"    = r."new_id" FROM "roles" r WHERE r."id" = k."role_id";--> statement-breakpoint
UPDATE "api_keys" k SET "new_created_by" = x."new_id" FROM "users" x WHERE x."id" = k."created_by";--> statement-breakpoint

ALTER TABLE "audit_logs" ADD COLUMN "new_record_id" uuid, ADD COLUMN "new_actor_id" uuid;--> statement-breakpoint
UPDATE "audit_logs" a SET "new_record_id" = x."new_id" FROM "users"    x WHERE a."record_type" = 'user'   AND x."id" = a."record_id";--> statement-breakpoint
UPDATE "audit_logs" a SET "new_record_id" = x."new_id" FROM "roles"    x WHERE a."record_type" = 'role'   AND x."id" = a."record_id";--> statement-breakpoint
UPDATE "audit_logs" a SET "new_record_id" = x."new_id" FROM "api_keys" x WHERE a."record_type" = 'apikey' AND x."id" = a."record_id";--> statement-breakpoint
UPDATE "audit_logs" a SET "new_actor_id"  = x."new_id" FROM "users"    x WHERE x."id" = a."actor_id";--> statement-breakpoint

-- Abort (whole migration rolls back) if any reference could not be mapped.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "users"            WHERE ("role_id"    IS NOT NULL AND "new_role_id"    IS NULL)
                                                 OR ("created_by" IS NOT NULL AND "new_created_by" IS NULL)
                                                 OR ("updated_by" IS NOT NULL AND "new_updated_by" IS NULL))
  OR EXISTS (SELECT 1 FROM "roles"            WHERE ("created_by" IS NOT NULL AND "new_created_by" IS NULL)
                                                 OR ("updated_by" IS NOT NULL AND "new_updated_by" IS NULL))
  OR EXISTS (SELECT 1 FROM "role_permissions" WHERE "new_role_id" IS NULL)
  OR EXISTS (SELECT 1 FROM "api_keys"         WHERE "new_role_id" IS NULL
                                                 OR ("created_by" IS NOT NULL AND "new_created_by" IS NULL))
  OR EXISTS (SELECT 1 FROM "audit_logs"       WHERE "new_record_id" IS NULL
                                                 OR ("actor_id" IS NOT NULL AND "new_actor_id" IS NULL))
  THEN
    RAISE EXCEPTION 'uuid migration: unmapped reference found — aborting';
  END IF;
END $$;
--> statement-breakpoint

-- 3. Drop foreign keys, then the old integer columns (drops their PKs, indexes, sequences)
ALTER TABLE "users"            DROP CONSTRAINT "users_role_id_roles_id_fk";--> statement-breakpoint
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_role_id_roles_id_fk";--> statement-breakpoint
ALTER TABLE "api_keys"         DROP CONSTRAINT "api_keys_role_id_roles_id_fk";--> statement-breakpoint

ALTER TABLE "users"            DROP COLUMN "id", DROP COLUMN "role_id", DROP COLUMN "created_by", DROP COLUMN "updated_by";--> statement-breakpoint
ALTER TABLE "roles"            DROP COLUMN "id", DROP COLUMN "created_by", DROP COLUMN "updated_by";--> statement-breakpoint
ALTER TABLE "role_permissions" DROP COLUMN "id", DROP COLUMN "role_id";--> statement-breakpoint
ALTER TABLE "api_keys"         DROP COLUMN "id", DROP COLUMN "role_id", DROP COLUMN "created_by";--> statement-breakpoint
ALTER TABLE "audit_logs"       DROP COLUMN "id", DROP COLUMN "record_id", DROP COLUMN "actor_id";--> statement-breakpoint

-- 4. Rename the new columns into place ---------------------------------------------------
ALTER TABLE "users" RENAME COLUMN "new_id" TO "id";--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "new_role_id" TO "role_id";--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "new_created_by" TO "created_by";--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "new_updated_by" TO "updated_by";--> statement-breakpoint
ALTER TABLE "roles" RENAME COLUMN "new_id" TO "id";--> statement-breakpoint
ALTER TABLE "roles" RENAME COLUMN "new_created_by" TO "created_by";--> statement-breakpoint
ALTER TABLE "roles" RENAME COLUMN "new_updated_by" TO "updated_by";--> statement-breakpoint
ALTER TABLE "role_permissions" RENAME COLUMN "new_id" TO "id";--> statement-breakpoint
ALTER TABLE "role_permissions" RENAME COLUMN "new_role_id" TO "role_id";--> statement-breakpoint
ALTER TABLE "api_keys" RENAME COLUMN "new_id" TO "id";--> statement-breakpoint
ALTER TABLE "api_keys" RENAME COLUMN "new_role_id" TO "role_id";--> statement-breakpoint
ALTER TABLE "api_keys" RENAME COLUMN "new_created_by" TO "created_by";--> statement-breakpoint
ALTER TABLE "audit_logs" RENAME COLUMN "new_id" TO "id";--> statement-breakpoint
ALTER TABLE "audit_logs" RENAME COLUMN "new_record_id" TO "record_id";--> statement-breakpoint
ALTER TABLE "audit_logs" RENAME COLUMN "new_actor_id" TO "actor_id";--> statement-breakpoint

-- 5. Primary keys, defaults, NOT NULLs ---------------------------------------------------
ALTER TABLE "roles"            ALTER COLUMN "id" SET DEFAULT gen_random_uuid(), ALTER COLUMN "id" SET NOT NULL, ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "users"            ALTER COLUMN "id" SET DEFAULT gen_random_uuid(), ALTER COLUMN "id" SET NOT NULL, ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "role_permissions" ALTER COLUMN "id" SET DEFAULT gen_random_uuid(), ALTER COLUMN "id" SET NOT NULL, ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "api_keys"         ALTER COLUMN "id" SET DEFAULT gen_random_uuid(), ALTER COLUMN "id" SET NOT NULL, ADD CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "audit_logs"       ALTER COLUMN "id" SET DEFAULT gen_random_uuid(), ALTER COLUMN "id" SET NOT NULL, ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "role_permissions" ALTER COLUMN "role_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys"         ALTER COLUMN "role_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs"       ALTER COLUMN "record_id" SET NOT NULL;--> statement-breakpoint

-- 6. Recreate foreign keys and indexes on the new columns --------------------------------
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_role_id_idx" ON "users" USING btree ("role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "role_permissions_role_module_unique" ON "role_permissions" USING btree ("role_id","module");--> statement-breakpoint
CREATE INDEX "api_keys_role_idx" ON "api_keys" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "audit_logs_record_idx" ON "audit_logs" USING btree ("record_type","record_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_id");
