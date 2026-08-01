import { sql } from "drizzle-orm";
import { index, integer, pgTable, text, uniqueIndex, boolean, timestamp } from "drizzle-orm/pg-core";

export const games = pgTable("games", {
  id: text("id").primaryKey(),
  appId: integer("app_id").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  type: text("type").notNull().default("game"),
  shortDescription: text("short_description"),
  developer: text("developer"),
  publisher: text("publisher"),
  releaseDate: text("release_date"),
  headerImageUrl: text("header_image_url"),
  capsuleImageUrl: text("capsule_image_url"),
  storeUrl: text("store_url"),
  isFree: boolean("is_free").notNull().default(false),
  isReleased: boolean("is_released").notNull().default(false),
  isAvailable: boolean("is_available").notNull().default(true),
  isTracked: boolean("is_tracked").notNull().default(true),
  metadataStatus: text("metadata_status").notNull().default("PENDING"),
  metadataUpdatedAt: timestamp("metadata_updated_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("games_app_id_unique").on(table.appId),
  index("games_name_idx").on(table.name),
  index("games_tracking_idx").on(table.isTracked, table.isAvailable),
  index("games_metadata_status_idx").on(table.metadataStatus),
]);

export const currentPrices = pgTable("current_prices", {
  id: text("id").primaryKey(),
  gameId: text("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  currency: text("currency").notNull().default("VND"),
  initialPrice: integer("initial_price").notNull(),
  finalPrice: integer("final_price").notNull(),
  discountPercent: integer("discount_percent").notNull(),
  isFree: boolean("is_free").notNull().default(false),
  isOnSale: boolean("is_on_sale").notNull().default(false),
  saleStartAt: timestamp("sale_start_at", { withTimezone: true, mode: "string" }),
  saleEndAt: timestamp("sale_end_at", { withTimezone: true, mode: "string" }),
  source: text("source").notNull(),
  sourceCheckedAt: timestamp("source_checked_at", { withTimezone: true, mode: "string" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("current_prices_game_currency_unique").on(table.gameId, table.currency),
  index("current_prices_value_idx").on(table.currency, table.finalPrice),
  index("current_prices_discount_idx").on(table.currency, table.discountPercent),
  index("current_prices_sale_idx").on(table.isOnSale, table.saleEndAt),
]);

export const priceHistory = pgTable("price_history", {
  id: text("id").primaryKey(),
  gameId: text("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  currency: text("currency").notNull().default("VND"),
  initialPrice: integer("initial_price").notNull(),
  finalPrice: integer("final_price").notNull(),
  discountPercent: integer("discount_percent").notNull(),
  isFree: boolean("is_free").notNull().default(false),
  isOnSale: boolean("is_on_sale").notNull().default(false),
  fingerprint: text("fingerprint").notNull(),
  source: text("source").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [
  index("price_history_game_currency_recorded_idx").on(table.gameId, table.currency, table.recordedAt),
  index("price_history_fingerprint_idx").on(table.fingerprint),
]);

export const lowestPrices = pgTable("lowest_prices", {
  id: text("id").primaryKey(),
  gameId: text("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  currency: text("currency").notNull().default("VND"),
  price: integer("price").notNull(),
  firstRecordedAt: timestamp("first_recorded_at", { withTimezone: true, mode: "string" }).notNull(),
  lastRecordedAt: timestamp("last_recorded_at", { withTimezone: true, mode: "string" }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("lowest_prices_game_currency_unique").on(table.gameId, table.currency),
  index("lowest_prices_value_idx").on(table.currency, table.price),
]);

export const genres = pgTable("genres", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
}, (table) => [uniqueIndex("genres_slug_unique").on(table.slug)]);

export const gameGenres = pgTable("game_genres", {
  gameId: text("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  genreId: text("genre_id").notNull().references(() => genres.id, { onDelete: "cascade" }),
}, (table) => [uniqueIndex("game_genres_unique").on(table.gameId, table.genreId)]);

export const syncJobs = pgTable("sync_jobs", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  status: text("status").notNull().default("PENDING"),
  totalItems: integer("total_items").notNull().default(0),
  processedItems: integer("processed_items").notNull().default(0),
  successItems: integer("success_items").notNull().default(0),
  failedItems: integer("failed_items").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true, mode: "string" }),
  completedAt: timestamp("completed_at", { withTimezone: true, mode: "string" }),
  triggeredBy: text("triggered_by").notNull(),
  errorSummary: text("error_summary"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [index("sync_jobs_status_created_idx").on(table.status, table.createdAt)]);

export const syncJobItems = pgTable("sync_job_items", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => syncJobs.id, { onDelete: "cascade" }),
  appId: integer("app_id").notNull(),
  status: text("status").notNull().default("PENDING"),
  attempts: integer("attempts").notNull().default(0),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at", { withTimezone: true, mode: "string" }),
  completedAt: timestamp("completed_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [index("sync_job_items_job_status_idx").on(table.jobId, table.status)]);

export const dataSourceState = pgTable("data_source_state", {
  provider: text("provider").primaryKey(),
  lastCatalogTimestamp: integer("last_catalog_timestamp"),
  lastSuccessAt: text("last_success_at"),
  consecutiveFailures: integer("consecutive_failures").notNull().default(0),
  disabledUntil: text("disabled_until"),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

// ==========================================
// PHASE 3: USER ACCOUNTS, AUTH & SESSIONS
// ==========================================

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  emailNormalized: text("email_normalized").notNull(),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true, mode: "string" }),
  passwordHash: text("password_hash"),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  locale: text("locale").notNull().default("vi-VN"),
  timezone: text("timezone").notNull().default("Asia/Ho_Chi_Minh"),
  status: text("status").notNull().default("PENDING_VERIFICATION"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
}, (table) => [
  uniqueIndex("users_email_normalized_unique").on(table.emailNormalized),
  index("users_status_idx").on(table.status),
]);

export const authAccounts = pgTable("auth_accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  accessTokenEncrypted: text("access_token_encrypted"),
  refreshTokenEncrypted: text("refresh_token_encrypted"),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("auth_accounts_provider_account_unique").on(table.provider, table.providerAccountId),
  index("auth_accounts_user_idx").on(table.userId),
]);

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  userAgentSummary: text("user_agent_summary"),
  ipHash: text("ip_hash"),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("sessions_token_hash_unique").on(table.tokenHash),
  index("sessions_user_expires_idx").on(table.userId, table.expiresAt),
]);

export const verificationTokens = pgTable("verification_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // VERIFY_EMAIL | RESET_PASSWORD | MAGIC_LOGIN | DELETE_ACCOUNT
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true, mode: "string" }),
  metadata: text("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("verification_tokens_hash_unique").on(table.tokenHash),
  index("verification_tokens_user_type_idx").on(table.userId, table.type),
]);

// ==========================================
// PHASE 3: WISHLIST & PRICE ALERTS
// ==========================================

export const wishlistItems = pgTable("wishlist_items", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  gameId: text("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  note: text("note"),
  priority: text("priority").notNull().default("NORMAL"), // LOW | NORMAL | HIGH
  addedAt: timestamp("added_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  archivedAt: timestamp("archived_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("wishlist_items_user_game_unique").on(table.userId, table.gameId),
  index("wishlist_items_user_added_idx").on(table.userId, table.addedAt),
]);

export const wishlistTags = pgTable("wishlist_tags", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  colorKey: text("color_key").notNull().default("blue"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("wishlist_tags_user_name_unique").on(table.userId, table.name),
]);

export const wishlistItemTags = pgTable("wishlist_item_tags", {
  wishlistItemId: text("wishlist_item_id").notNull().references(() => wishlistItems.id, { onDelete: "cascade" }),
  tagId: text("tag_id").notNull().references(() => wishlistTags.id, { onDelete: "cascade" }),
}, (table) => [
  uniqueIndex("wishlist_item_tags_unique").on(table.wishlistItemId, table.tagId),
]);

export const priceAlerts = pgTable("price_alerts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  gameId: text("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  wishlistItemId: text("wishlist_item_id").references(() => wishlistItems.id, { onDelete: "set null" }),
  alertType: text("alert_type").notNull(), // PRICE_BELOW | DISCOUNT_AT_LEAST | SALE_STARTED | RECORDED_LOWEST | PRICE_DROPPED
  targetPrice: integer("target_price"),
  targetDiscountPercent: integer("target_discount_percent"),
  status: text("status").notNull().default("ACTIVE"), // ACTIVE | PAUSED | TRIGGERED | EXPIRED | DELETED
  cooldownHours: integer("cooldown_hours").notNull().default(24),
  lastTriggeredAt: timestamp("last_triggered_at", { withTimezone: true, mode: "string" }),
  lastEvaluatedAt: timestamp("last_evaluated_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
}, (table) => [
  index("price_alerts_user_status_idx").on(table.userId, table.status),
  index("price_alerts_game_status_idx").on(table.gameId, table.status),
]);

export const alertChannels = pgTable("alert_channels", {
  id: text("id").primaryKey(),
  alertId: text("alert_id").notNull().references(() => priceAlerts.id, { onDelete: "cascade" }),
  channel: text("channel").notNull(), // IN_APP | EMAIL
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("alert_channels_alert_channel_unique").on(table.alertId, table.channel),
]);

// ==========================================
// PHASE 3: EVENTS, NOTIFICATIONS & AUDIT LOGS
// ==========================================

export const priceEvents = pgTable("price_events", {
  id: text("id").primaryKey(),
  gameId: text("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(), // PRICE_CHANGED | SALE_STARTED | SALE_ENDED | NEW_RECORDED_LOWEST | BECAME_FREE
  previousPrice: integer("previous_price"),
  currentPrice: integer("current_price").notNull(),
  previousDiscount: integer("previous_discount"),
  currentDiscount: integer("current_discount").notNull(),
  priceHistoryId: text("price_history_id").references(() => priceHistory.id, { onDelete: "set null" }),
  fingerprint: text("fingerprint").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("price_events_fingerprint_unique").on(table.fingerprint),
  index("price_events_game_occurred_idx").on(table.gameId, table.occurredAt),
]);

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // PRICE_ALERT | SYSTEM | SECURITY
  title: text("title").notNull(),
  body: text("body").notNull(),
  gameId: text("game_id").references(() => games.id, { onDelete: "cascade" }),
  alertId: text("alert_id").references(() => priceAlerts.id, { onDelete: "set null" }),
  eventId: text("event_id").references(() => priceEvents.id, { onDelete: "set null" }),
  actionUrl: text("action_url"),
  readAt: timestamp("read_at", { withTimezone: true, mode: "string" }),
  archivedAt: timestamp("archived_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }),
}, (table) => [
  index("notifications_user_read_idx").on(table.userId, table.readAt, table.createdAt),
]);

export const notificationDeliveries = pgTable("notification_deliveries", {
  id: text("id").primaryKey(),
  notificationId: text("notification_id").notNull().references(() => notifications.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  channel: text("channel").notNull(), // IN_APP | EMAIL
  provider: text("provider").notNull().default("INTERNAL"),
  destinationHash: text("destination_hash"),
  status: text("status").notNull().default("PENDING"), // PENDING | PROCESSING | SENT | DELIVERED | FAILED | SUPPRESSED
  attempts: integer("attempts").notNull().default(0),
  providerMessageId: text("provider_message_id"),
  idempotencyKey: text("idempotency_key").notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  sentAt: timestamp("sent_at", { withTimezone: true, mode: "string" }),
  failedAt: timestamp("failed_at", { withTimezone: true, mode: "string" }),
  lastErrorMessage: text("last_error_message"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("notification_deliveries_idempotency_unique").on(table.idempotencyKey),
  index("notification_deliveries_status_scheduled_idx").on(table.status, table.scheduledAt),
]);

export const notificationPreferences = pgTable("notification_preferences", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  emailEnabled: boolean("email_enabled").notNull().default(true),
  inAppEnabled: boolean("in_app_enabled").notNull().default(true),
  instantEmailEnabled: boolean("instant_email_enabled").notNull().default(true),
  digestEnabled: boolean("digest_enabled").notNull().default(false),
  digestFrequency: text("digest_frequency").notNull().default("DAILY"), // DAILY | WEEKLY
  quietHoursEnabled: boolean("quiet_hours_enabled").notNull().default(false),
  quietHoursStart: text("quiet_hours_start").default("22:00"),
  quietHoursEnd: text("quiet_hours_end").default("07:00"),
  marketingEmailEnabled: boolean("marketing_email_enabled").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

export const emailSuppressions = pgTable("email_suppressions", {
  id: text("id").primaryKey(),
  emailHash: text("email_hash").notNull(),
  reason: text("reason").notNull(), // UNSUBSCRIBED | BOUNCE | COMPLAINT | MANUAL_BLOCK
  source: text("source").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("email_suppressions_hash_reason_unique").on(table.emailHash, table.reason),
]);

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  actorType: text("actor_type").notNull().default("USER"), // USER | SYSTEM | ADMIN
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [
  index("audit_logs_user_action_idx").on(table.userId, table.action, table.createdAt),
]);

// ==========================================
// PHASE 4: POPULARITY CYCLES & SCAN TASKS
// ==========================================

export const popularityCycles = pgTable("popularity_cycles", {
  id: text("id").primaryKey(),
  startDate: timestamp("start_date", { withTimezone: true, mode: "string" }).notNull().unique(),
  endDate: timestamp("end_date", { withTimezone: true, mode: "string" }).notNull(),
  status: text("status").notNull(),
  totalGames: integer("total_games").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true, mode: "string" }),
});

export const popularitySnapshots = pgTable("popularity_snapshots", {
  id: text("id").primaryKey(),
  cycleId: text("cycle_id").notNull().references(() => popularityCycles.id, { onDelete: "cascade" }),
  gameId: text("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  popularityRank: integer("popularity_rank").notNull(),
  part: integer("part").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("pop_snap_cycle_game_unique").on(table.cycleId, table.gameId),
  uniqueIndex("pop_snap_cycle_rank_unique").on(table.cycleId, table.popularityRank),
  index("pop_snap_cycle_part_idx").on(table.cycleId, table.part),
]);

export const scanRuns = pgTable("scan_runs", {
  id: text("id").primaryKey(),
  cycleId: text("cycle_id").notNull().references(() => popularityCycles.id, { onDelete: "cascade" }),
  part: integer("part").notNull(),
  status: text("status").notNull(),
  targetCount: integer("target_count").notNull(),
  successCount: integer("success_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true, mode: "string" }),
  completedAt: timestamp("completed_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [
  index("scan_runs_cycle_part_idx").on(table.cycleId, table.part),
]);

export const scanTasks = pgTable("scan_tasks", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull().references(() => scanRuns.id, { onDelete: "cascade" }),
  gameId: text("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("PENDING"),
  attempts: integer("attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true, mode: "string" }),
  lastErrorCode: text("last_error_code"),
  completedAt: timestamp("completed_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("scan_tasks_run_game_unique").on(table.runId, table.gameId),
  index("scan_tasks_run_status_idx").on(table.runId, table.status),
  index("scan_tasks_status_locked_idx").on(table.status, table.lockedUntil),
]);
