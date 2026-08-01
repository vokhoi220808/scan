CREATE TABLE "alert_channels" (
	"id" text PRIMARY KEY NOT NULL,
	"alert_id" text NOT NULL,
	"channel" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"actor_type" text DEFAULT 'USER' NOT NULL,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"access_token_encrypted" text,
	"refresh_token_encrypted" text,
	"token_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "current_prices" (
	"id" text PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"currency" text DEFAULT 'VND' NOT NULL,
	"initial_price" integer NOT NULL,
	"final_price" integer NOT NULL,
	"discount_percent" integer NOT NULL,
	"is_free" boolean DEFAULT false NOT NULL,
	"is_on_sale" boolean DEFAULT false NOT NULL,
	"sale_start_at" timestamp with time zone,
	"sale_end_at" timestamp with time zone,
	"source" text NOT NULL,
	"source_checked_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_source_state" (
	"provider" text PRIMARY KEY NOT NULL,
	"last_catalog_timestamp" integer,
	"last_success_at" text,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"disabled_until" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_suppressions" (
	"id" text PRIMARY KEY NOT NULL,
	"email_hash" text NOT NULL,
	"reason" text NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_genres" (
	"game_id" text NOT NULL,
	"genre_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" text PRIMARY KEY NOT NULL,
	"app_id" integer NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"type" text DEFAULT 'game' NOT NULL,
	"short_description" text,
	"developer" text,
	"publisher" text,
	"release_date" text,
	"header_image_url" text,
	"capsule_image_url" text,
	"store_url" text,
	"is_free" boolean DEFAULT false NOT NULL,
	"is_released" boolean DEFAULT false NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"is_tracked" boolean DEFAULT true NOT NULL,
	"metadata_status" text DEFAULT 'PENDING' NOT NULL,
	"metadata_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "genres" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lowest_prices" (
	"id" text PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"currency" text DEFAULT 'VND' NOT NULL,
	"price" integer NOT NULL,
	"first_recorded_at" timestamp with time zone NOT NULL,
	"last_recorded_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"notification_id" text NOT NULL,
	"user_id" text NOT NULL,
	"channel" text NOT NULL,
	"provider" text DEFAULT 'INTERNAL' NOT NULL,
	"destination_hash" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"provider_message_id" text,
	"idempotency_key" text NOT NULL,
	"scheduled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"last_error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"in_app_enabled" boolean DEFAULT true NOT NULL,
	"instant_email_enabled" boolean DEFAULT true NOT NULL,
	"digest_enabled" boolean DEFAULT false NOT NULL,
	"digest_frequency" text DEFAULT 'DAILY' NOT NULL,
	"quiet_hours_enabled" boolean DEFAULT false NOT NULL,
	"quiet_hours_start" text DEFAULT '22:00',
	"quiet_hours_end" text DEFAULT '07:00',
	"marketing_email_enabled" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"game_id" text,
	"alert_id" text,
	"event_id" text,
	"action_url" text,
	"read_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "popularity_cycles" (
	"id" text PRIMARY KEY NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"total_games" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "popularity_cycles_start_date_unique" UNIQUE("start_date")
);
--> statement-breakpoint
CREATE TABLE "popularity_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"cycle_id" text NOT NULL,
	"game_id" text NOT NULL,
	"popularity_rank" integer NOT NULL,
	"part" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"game_id" text NOT NULL,
	"wishlist_item_id" text,
	"alert_type" text NOT NULL,
	"target_price" integer,
	"target_discount_percent" integer,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"cooldown_hours" integer DEFAULT 24 NOT NULL,
	"last_triggered_at" timestamp with time zone,
	"last_evaluated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "price_events" (
	"id" text PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"event_type" text NOT NULL,
	"previous_price" integer,
	"current_price" integer NOT NULL,
	"previous_discount" integer,
	"current_discount" integer NOT NULL,
	"price_history_id" text,
	"fingerprint" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_history" (
	"id" text PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"currency" text DEFAULT 'VND' NOT NULL,
	"initial_price" integer NOT NULL,
	"final_price" integer NOT NULL,
	"discount_percent" integer NOT NULL,
	"is_free" boolean DEFAULT false NOT NULL,
	"is_on_sale" boolean DEFAULT false NOT NULL,
	"fingerprint" text NOT NULL,
	"source" text NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scan_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"cycle_id" text NOT NULL,
	"part" integer NOT NULL,
	"status" text NOT NULL,
	"target_count" integer NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scan_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"game_id" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"last_error_code" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"user_agent_summary" text,
	"ip_hash" text,
	"expires_at" timestamp with time zone NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_job_items" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"app_id" integer NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"error_code" text,
	"error_message" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"total_items" integer DEFAULT 0 NOT NULL,
	"processed_items" integer DEFAULT 0 NOT NULL,
	"success_items" integer DEFAULT 0 NOT NULL,
	"failed_items" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"triggered_by" text NOT NULL,
	"error_summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"email_normalized" text NOT NULL,
	"email_verified_at" timestamp with time zone,
	"password_hash" text,
	"display_name" text,
	"avatar_url" text,
	"locale" text DEFAULT 'vi-VN' NOT NULL,
	"timezone" text DEFAULT 'Asia/Ho_Chi_Minh' NOT NULL,
	"status" text DEFAULT 'PENDING_VERIFICATION' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wishlist_item_tags" (
	"wishlist_item_id" text NOT NULL,
	"tag_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wishlist_items" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"game_id" text NOT NULL,
	"note" text,
	"priority" text DEFAULT 'NORMAL' NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wishlist_tags" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"color_key" text DEFAULT 'blue' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alert_channels" ADD CONSTRAINT "alert_channels_alert_id_price_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."price_alerts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "current_prices" ADD CONSTRAINT "current_prices_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_genres" ADD CONSTRAINT "game_genres_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_genres" ADD CONSTRAINT "game_genres_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lowest_prices" ADD CONSTRAINT "lowest_prices_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_alert_id_price_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."price_alerts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_event_id_price_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."price_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "popularity_snapshots" ADD CONSTRAINT "popularity_snapshots_cycle_id_popularity_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."popularity_cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "popularity_snapshots" ADD CONSTRAINT "popularity_snapshots_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_alerts" ADD CONSTRAINT "price_alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_alerts" ADD CONSTRAINT "price_alerts_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_alerts" ADD CONSTRAINT "price_alerts_wishlist_item_id_wishlist_items_id_fk" FOREIGN KEY ("wishlist_item_id") REFERENCES "public"."wishlist_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_events" ADD CONSTRAINT "price_events_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_events" ADD CONSTRAINT "price_events_price_history_id_price_history_id_fk" FOREIGN KEY ("price_history_id") REFERENCES "public"."price_history"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_runs" ADD CONSTRAINT "scan_runs_cycle_id_popularity_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."popularity_cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_tasks" ADD CONSTRAINT "scan_tasks_run_id_scan_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."scan_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_tasks" ADD CONSTRAINT "scan_tasks_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_job_items" ADD CONSTRAINT "sync_job_items_job_id_sync_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."sync_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_item_tags" ADD CONSTRAINT "wishlist_item_tags_wishlist_item_id_wishlist_items_id_fk" FOREIGN KEY ("wishlist_item_id") REFERENCES "public"."wishlist_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_item_tags" ADD CONSTRAINT "wishlist_item_tags_tag_id_wishlist_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."wishlist_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_tags" ADD CONSTRAINT "wishlist_tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "alert_channels_alert_channel_unique" ON "alert_channels" USING btree ("alert_id","channel");--> statement-breakpoint
CREATE INDEX "audit_logs_user_action_idx" ON "audit_logs" USING btree ("user_id","action","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_accounts_provider_account_unique" ON "auth_accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE INDEX "auth_accounts_user_idx" ON "auth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "current_prices_game_currency_unique" ON "current_prices" USING btree ("game_id","currency");--> statement-breakpoint
CREATE INDEX "current_prices_value_idx" ON "current_prices" USING btree ("currency","final_price");--> statement-breakpoint
CREATE INDEX "current_prices_discount_idx" ON "current_prices" USING btree ("currency","discount_percent");--> statement-breakpoint
CREATE INDEX "current_prices_sale_idx" ON "current_prices" USING btree ("is_on_sale","sale_end_at");--> statement-breakpoint
CREATE UNIQUE INDEX "email_suppressions_hash_reason_unique" ON "email_suppressions" USING btree ("email_hash","reason");--> statement-breakpoint
CREATE UNIQUE INDEX "game_genres_unique" ON "game_genres" USING btree ("game_id","genre_id");--> statement-breakpoint
CREATE UNIQUE INDEX "games_app_id_unique" ON "games" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "games_name_idx" ON "games" USING btree ("name");--> statement-breakpoint
CREATE INDEX "games_tracking_idx" ON "games" USING btree ("is_tracked","is_available");--> statement-breakpoint
CREATE INDEX "games_metadata_status_idx" ON "games" USING btree ("metadata_status");--> statement-breakpoint
CREATE UNIQUE INDEX "genres_slug_unique" ON "genres" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "lowest_prices_game_currency_unique" ON "lowest_prices" USING btree ("game_id","currency");--> statement-breakpoint
CREATE INDEX "lowest_prices_value_idx" ON "lowest_prices" USING btree ("currency","price");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_deliveries_idempotency_unique" ON "notification_deliveries" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "notification_deliveries_status_scheduled_idx" ON "notification_deliveries" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE INDEX "notifications_user_read_idx" ON "notifications" USING btree ("user_id","read_at","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "pop_snap_cycle_game_unique" ON "popularity_snapshots" USING btree ("cycle_id","game_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pop_snap_cycle_rank_unique" ON "popularity_snapshots" USING btree ("cycle_id","popularity_rank");--> statement-breakpoint
CREATE INDEX "pop_snap_cycle_part_idx" ON "popularity_snapshots" USING btree ("cycle_id","part");--> statement-breakpoint
CREATE INDEX "price_alerts_user_status_idx" ON "price_alerts" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "price_alerts_game_status_idx" ON "price_alerts" USING btree ("game_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "price_events_fingerprint_unique" ON "price_events" USING btree ("fingerprint");--> statement-breakpoint
CREATE INDEX "price_events_game_occurred_idx" ON "price_events" USING btree ("game_id","occurred_at");--> statement-breakpoint
CREATE INDEX "price_history_game_currency_recorded_idx" ON "price_history" USING btree ("game_id","currency","recorded_at");--> statement-breakpoint
CREATE INDEX "price_history_fingerprint_idx" ON "price_history" USING btree ("fingerprint");--> statement-breakpoint
CREATE INDEX "scan_runs_cycle_part_idx" ON "scan_runs" USING btree ("cycle_id","part");--> statement-breakpoint
CREATE UNIQUE INDEX "scan_tasks_run_game_unique" ON "scan_tasks" USING btree ("run_id","game_id");--> statement-breakpoint
CREATE INDEX "scan_tasks_run_status_idx" ON "scan_tasks" USING btree ("run_id","status");--> statement-breakpoint
CREATE INDEX "scan_tasks_status_locked_idx" ON "scan_tasks" USING btree ("status","locked_until");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_unique" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_expires_idx" ON "sessions" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE INDEX "sync_job_items_job_status_idx" ON "sync_job_items" USING btree ("job_id","status");--> statement-breakpoint
CREATE INDEX "sync_jobs_status_created_idx" ON "sync_jobs" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_normalized_unique" ON "users" USING btree ("email_normalized");--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "verification_tokens_hash_unique" ON "verification_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "verification_tokens_user_type_idx" ON "verification_tokens" USING btree ("user_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "wishlist_item_tags_unique" ON "wishlist_item_tags" USING btree ("wishlist_item_id","tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wishlist_items_user_game_unique" ON "wishlist_items" USING btree ("user_id","game_id");--> statement-breakpoint
CREATE INDEX "wishlist_items_user_added_idx" ON "wishlist_items" USING btree ("user_id","added_at");--> statement-breakpoint
CREATE UNIQUE INDEX "wishlist_tags_user_name_unique" ON "wishlist_tags" USING btree ("user_id","name");