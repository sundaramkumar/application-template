CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"record_type" varchar(50) NOT NULL,
	"record_id" integer NOT NULL,
	"action" varchar(20) NOT NULL,
	"actor_id" integer,
	"changes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "audit_logs_record_idx" ON "audit_logs" USING btree ("record_type","record_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_id");