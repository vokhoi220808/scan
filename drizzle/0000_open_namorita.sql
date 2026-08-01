CREATE TABLE `current_prices` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`currency` text DEFAULT 'VND' NOT NULL,
	`initial_price` integer NOT NULL,
	`final_price` integer NOT NULL,
	`discount_percent` integer NOT NULL,
	`is_free` integer DEFAULT false NOT NULL,
	`is_on_sale` integer DEFAULT false NOT NULL,
	`sale_start_at` text,
	`sale_end_at` text,
	`source` text NOT NULL,
	`source_checked_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `current_prices_game_currency_unique` ON `current_prices` (`game_id`,`currency`);--> statement-breakpoint
CREATE INDEX `current_prices_value_idx` ON `current_prices` (`currency`,`final_price`);--> statement-breakpoint
CREATE INDEX `current_prices_discount_idx` ON `current_prices` (`currency`,`discount_percent`);--> statement-breakpoint
CREATE INDEX `current_prices_sale_idx` ON `current_prices` (`is_on_sale`,`sale_end_at`);--> statement-breakpoint
CREATE TABLE `data_source_state` (
	`provider` text PRIMARY KEY NOT NULL,
	`last_catalog_timestamp` integer,
	`last_success_at` text,
	`consecutive_failures` integer DEFAULT 0 NOT NULL,
	`disabled_until` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `game_genres` (
	`game_id` text NOT NULL,
	`genre_id` text NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`genre_id`) REFERENCES `genres`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_genres_unique` ON `game_genres` (`game_id`,`genre_id`);--> statement-breakpoint
CREATE TABLE `games` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` integer NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`type` text DEFAULT 'game' NOT NULL,
	`short_description` text,
	`developer` text,
	`publisher` text,
	`release_date` text,
	`header_image_url` text,
	`capsule_image_url` text,
	`store_url` text,
	`is_free` integer DEFAULT false NOT NULL,
	`is_released` integer DEFAULT false NOT NULL,
	`is_available` integer DEFAULT true NOT NULL,
	`is_tracked` integer DEFAULT true NOT NULL,
	`metadata_status` text DEFAULT 'PENDING' NOT NULL,
	`metadata_updated_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `games_app_id_unique` ON `games` (`app_id`);--> statement-breakpoint
CREATE INDEX `games_name_idx` ON `games` (`name`);--> statement-breakpoint
CREATE INDEX `games_tracking_idx` ON `games` (`is_tracked`,`is_available`);--> statement-breakpoint
CREATE INDEX `games_metadata_status_idx` ON `games` (`metadata_status`);--> statement-breakpoint
CREATE TABLE `genres` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `genres_slug_unique` ON `genres` (`slug`);--> statement-breakpoint
CREATE TABLE `lowest_prices` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`currency` text DEFAULT 'VND' NOT NULL,
	`price` integer NOT NULL,
	`first_recorded_at` text NOT NULL,
	`last_recorded_at` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lowest_prices_game_currency_unique` ON `lowest_prices` (`game_id`,`currency`);--> statement-breakpoint
CREATE INDEX `lowest_prices_value_idx` ON `lowest_prices` (`currency`,`price`);--> statement-breakpoint
CREATE TABLE `price_history` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`currency` text DEFAULT 'VND' NOT NULL,
	`initial_price` integer NOT NULL,
	`final_price` integer NOT NULL,
	`discount_percent` integer NOT NULL,
	`is_free` integer DEFAULT false NOT NULL,
	`is_on_sale` integer DEFAULT false NOT NULL,
	`fingerprint` text NOT NULL,
	`source` text NOT NULL,
	`recorded_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `price_history_game_currency_recorded_idx` ON `price_history` (`game_id`,`currency`,`recorded_at`);--> statement-breakpoint
CREATE INDEX `price_history_fingerprint_idx` ON `price_history` (`fingerprint`);--> statement-breakpoint
CREATE TABLE `sync_job_items` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`app_id` integer NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`error_code` text,
	`error_message` text,
	`started_at` text,
	`completed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `sync_jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sync_job_items_job_status_idx` ON `sync_job_items` (`job_id`,`status`);--> statement-breakpoint
CREATE TABLE `sync_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`total_items` integer DEFAULT 0 NOT NULL,
	`processed_items` integer DEFAULT 0 NOT NULL,
	`success_items` integer DEFAULT 0 NOT NULL,
	`failed_items` integer DEFAULT 0 NOT NULL,
	`started_at` text,
	`completed_at` text,
	`triggered_by` text NOT NULL,
	`error_summary` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sync_jobs_status_created_idx` ON `sync_jobs` (`status`,`created_at`);