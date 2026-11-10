CREATE TABLE `api_endpoints` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`grp` varchar(64) NOT NULL DEFAULT 'general',
	`method` varchar(16) NOT NULL DEFAULT 'GET',
	`url` varchar(2048) NOT NULL DEFAULT '',
	`headers` json DEFAULT ('{}'),
	`sample_body` text NOT NULL DEFAULT (''),
	`auth_kind` varchar(64) NOT NULL DEFAULT 'none',
	`active` boolean NOT NULL DEFAULT true,
	`note` text NOT NULL DEFAULT (''),
	`last_status` int,
	`last_ok` boolean,
	`last_ms` int,
	`last_tested_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `api_endpoints_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `api_integrations` (
	`id` varchar(36) NOT NULL,
	`provider` varchar(128) NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(64) NOT NULL DEFAULT 'general',
	`base_url` varchar(2048) NOT NULL DEFAULT '',
	`sender_id` varchar(255) NOT NULL DEFAULT '',
	`api_key` varchar(512) NOT NULL DEFAULT '',
	`api_secret` varchar(512) NOT NULL DEFAULT '',
	`config` json DEFAULT ('{}'),
	`note` text NOT NULL DEFAULT (''),
	`active` boolean NOT NULL DEFAULT true,
	`last_ok` boolean,
	`last_status` int,
	`last_tested_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `api_integrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `api_integrations_provider_uidx` UNIQUE(`provider`)
);
--> statement-breakpoint
CREATE TABLE `api_test_logs` (
	`id` varchar(36) NOT NULL,
	`endpoint_id` varchar(36),
	`name` varchar(255) NOT NULL DEFAULT '',
	`method` varchar(16) NOT NULL DEFAULT 'GET',
	`url` varchar(2048) NOT NULL DEFAULT '',
	`status_code` int,
	`ok` boolean NOT NULL DEFAULT false,
	`duration_ms` int NOT NULL DEFAULT 0,
	`response_excerpt` text NOT NULL DEFAULT (''),
	`error` text NOT NULL DEFAULT (''),
	`actor_id` varchar(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `api_test_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `app_settings` (
	`key` varchar(128) NOT NULL,
	`value` json,
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `app_settings_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `appointment_reminders` (
	`id` varchar(36) NOT NULL,
	`appointment_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`channel` varchar(32) NOT NULL DEFAULT 'whatsapp',
	`target` varchar(255) NOT NULL DEFAULT '',
	`body` text NOT NULL DEFAULT (''),
	`status` varchar(32) NOT NULL DEFAULT 'queued',
	`sent_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `appointment_reminders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `appointments` (
	`id` varchar(36) NOT NULL,
	`invoice_no` varchar(64) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`doctor_id` varchar(64) NOT NULL,
	`doctor_name` varchar(255) NOT NULL DEFAULT '',
	`doctor_spec` varchar(255) NOT NULL DEFAULT '',
	`mode` varchar(32) NOT NULL DEFAULT 'video',
	`scheduled_at` datetime(3) NOT NULL,
	`patient_name` varchar(255) NOT NULL DEFAULT '',
	`phone` varchar(32) NOT NULL DEFAULT '',
	`note` text,
	`fee` decimal(12,2) NOT NULL DEFAULT '0',
	`payment_method` varchar(64) NOT NULL DEFAULT 'cod',
	`payment_status` varchar(64) NOT NULL DEFAULT 'pending',
	`payment_ref` varchar(128) NOT NULL DEFAULT '',
	`status` varchar(64) NOT NULL DEFAULT 'confirmed',
	`join_url` varchar(1024) NOT NULL DEFAULT '',
	`cancel_reason` text NOT NULL DEFAULT (''),
	`cancelled_at` datetime(3),
	`refund_status` varchar(64) NOT NULL DEFAULT 'none',
	`refund_amount` decimal(12,2) NOT NULL DEFAULT '0',
	`reminder_sent_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `appointments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `branches` (
	`id` varchar(36) NOT NULL,
	`code` varchar(32) NOT NULL,
	`name` varchar(255) NOT NULL,
	`name_en` varchar(255) NOT NULL DEFAULT '',
	`address` text NOT NULL DEFAULT (''),
	`phone` varchar(32) NOT NULL DEFAULT '',
	`is_main` boolean NOT NULL DEFAULT false,
	`active` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `branches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaign_sends` (
	`id` varchar(36) NOT NULL,
	`segment` varchar(64) NOT NULL,
	`title` varchar(512) NOT NULL,
	`body` text NOT NULL DEFAULT (''),
	`sent_count` int NOT NULL DEFAULT 0,
	`actor_id` varchar(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `campaign_sends_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` varchar(36) NOT NULL,
	`slug` varchar(120) NOT NULL,
	`name` varchar(255) NOT NULL,
	`name_en` varchar(255),
	`icon` varchar(64),
	`kind` varchar(32) NOT NULL DEFAULT 'product',
	`home_delivery` boolean NOT NULL DEFAULT true,
	`home_service` boolean NOT NULL DEFAULT false,
	`service_route` varchar(255) NOT NULL DEFAULT '',
	`description` text,
	`description_en` text,
	`eta` varchar(255) NOT NULL DEFAULT '',
	`eta_en` varchar(255) NOT NULL DEFAULT '',
	`base_fee` decimal(12,2) NOT NULL DEFAULT '0',
	`sort_order` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chart_accounts` (
	`code` varchar(32) NOT NULL,
	`name` varchar(255) NOT NULL,
	`name_en` varchar(255) NOT NULL DEFAULT '',
	`kind` varchar(32) NOT NULL DEFAULT 'asset',
	`parent_code` varchar(32),
	`active` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `chart_accounts_code` PRIMARY KEY(`code`)
);
--> statement-breakpoint
CREATE TABLE `consultation_media` (
	`id` varchar(36) NOT NULL,
	`appointment_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`kind` varchar(64) NOT NULL DEFAULT 'recording',
	`url` varchar(2048) NOT NULL DEFAULT '',
	`name` varchar(512) NOT NULL DEFAULT '',
	`transcript` text NOT NULL DEFAULT (''),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `consultation_media_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `consultation_messages` (
	`id` varchar(36) NOT NULL,
	`appointment_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`sender` varchar(32) NOT NULL DEFAULT 'patient',
	`body` text NOT NULL DEFAULT (''),
	`file_url` varchar(2048) NOT NULL DEFAULT '',
	`file_name` varchar(512) NOT NULL DEFAULT '',
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `consultation_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `consultation_prescriptions` (
	`id` varchar(36) NOT NULL,
	`appointment_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`doctor_name` varchar(255) NOT NULL DEFAULT '',
	`patient_name` varchar(255) NOT NULL DEFAULT '',
	`diagnosis` text NOT NULL DEFAULT (''),
	`advice` text NOT NULL DEFAULT (''),
	`items` json NOT NULL,
	`follow_up` varchar(32) NOT NULL DEFAULT '',
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `consultation_prescriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `deliveries` (
	`id` varchar(36) NOT NULL,
	`order_id` varchar(36) NOT NULL,
	`order_no` varchar(64) NOT NULL DEFAULT '',
	`user_id` varchar(36),
	`rider_id` varchar(36),
	`status` varchar(64) NOT NULL DEFAULT 'unassigned',
	`eta_minutes` int NOT NULL DEFAULT 45,
	`last_lat` decimal(10,7),
	`last_lng` decimal(10,7),
	`last_seen_at` datetime(3),
	`assigned_at` datetime(3),
	`note` text,
	`otp` varchar(16),
	`pod_photo_url` varchar(1024),
	`pod_signature_url` varchar(1024),
	`pod_receiver_name` varchar(255),
	`picked_at` datetime(3),
	`delivered_at` datetime(3),
	`pod_at` datetime(3),
	`public_token` varchar(64),
	`token_expires_at` datetime(3),
	`token_revoked` boolean NOT NULL DEFAULT false,
	`token_scope` varchar(64) NOT NULL DEFAULT 'track',
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `deliveries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `delivery_events` (
	`id` varchar(36) NOT NULL,
	`delivery_id` varchar(36) NOT NULL,
	`status` varchar(64) NOT NULL,
	`note` text NOT NULL DEFAULT (''),
	`lat` decimal(10,7),
	`lng` decimal(10,7),
	`actor` varchar(64) NOT NULL DEFAULT 'system',
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `delivery_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `delivery_notifications` (
	`id` varchar(36) NOT NULL,
	`delivery_id` varchar(36) NOT NULL,
	`order_no` varchar(64) NOT NULL DEFAULT '',
	`user_id` varchar(36) NOT NULL,
	`channel` varchar(32) NOT NULL DEFAULT 'sms',
	`target` varchar(255) NOT NULL DEFAULT '',
	`status_key` varchar(64) NOT NULL DEFAULT '',
	`body` text NOT NULL DEFAULT (''),
	`status` varchar(32) NOT NULL DEFAULT 'queued',
	`sent_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `delivery_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `delivery_zones` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`name_en` varchar(255) NOT NULL DEFAULT '',
	`district` varchar(128) NOT NULL DEFAULT '',
	`thana` varchar(128) NOT NULL DEFAULT '',
	`fee` decimal(12,2) NOT NULL DEFAULT '40',
	`express_fee` decimal(12,2) NOT NULL DEFAULT '90',
	`free_above` decimal(12,2) NOT NULL DEFAULT '0',
	`min_order` decimal(12,2) NOT NULL DEFAULT '0',
	`eta_minutes` int NOT NULL DEFAULT 60,
	`active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `delivery_zones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `diagnostic_bookings` (
	`id` varchar(36) NOT NULL,
	`booking_no` varchar(64) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`patient_name` varchar(255) NOT NULL DEFAULT '',
	`phone` varchar(32) NOT NULL DEFAULT '',
	`address` text,
	`area` varchar(255) NOT NULL DEFAULT '',
	`city_zone` varchar(128) NOT NULL DEFAULT '',
	`thana` varchar(128) NOT NULL DEFAULT '',
	`district` varchar(128) NOT NULL DEFAULT '',
	`lat` decimal(10,7),
	`lng` decimal(10,7),
	`scheduled_date` varchar(32) NOT NULL DEFAULT '',
	`slot` varchar(64) NOT NULL DEFAULT '',
	`tests` json NOT NULL,
	`subtotal` decimal(12,2) NOT NULL DEFAULT '0',
	`discount` decimal(12,2) NOT NULL DEFAULT '0',
	`collection_fee` decimal(12,2) NOT NULL DEFAULT '0',
	`total` decimal(12,2) NOT NULL DEFAULT '0',
	`payment_method` varchar(64) NOT NULL DEFAULT 'cod',
	`payment_status` varchar(64) NOT NULL DEFAULT 'pending',
	`status` varchar(64) NOT NULL DEFAULT 'requested',
	`note` text,
	`collector_name` varchar(255) NOT NULL DEFAULT '',
	`collector_phone` varchar(32) NOT NULL DEFAULT '',
	`report_url` varchar(1024) NOT NULL DEFAULT '',
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `diagnostic_bookings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `doctor_blackouts` (
	`id` varchar(36) NOT NULL,
	`doctor_id` varchar(64) NOT NULL,
	`day` varchar(10) NOT NULL,
	`reason` text NOT NULL DEFAULT (''),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `doctor_blackouts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `doctor_reviews` (
	`id` varchar(36) NOT NULL,
	`appointment_id` varchar(36) NOT NULL,
	`doctor_id` varchar(64) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`patient_name` varchar(255) NOT NULL DEFAULT '',
	`rating` int NOT NULL DEFAULT 5,
	`comment` text NOT NULL DEFAULT (''),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `doctor_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `doctors` (
	`id` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`spec` varchar(255) NOT NULL DEFAULT '',
	`degree` varchar(255) NOT NULL DEFAULT '',
	`exp` varchar(128) NOT NULL DEFAULT '',
	`fee` decimal(12,2) NOT NULL DEFAULT '0',
	`emoji` varchar(16) NOT NULL DEFAULT '🩺',
	`photo_url` varchar(1024) NOT NULL DEFAULT '',
	`phone` varchar(32) NOT NULL DEFAULT '',
	`whatsapp` varchar(32) NOT NULL DEFAULT '',
	`video_url` varchar(1024) NOT NULL DEFAULT '',
	`online` boolean NOT NULL DEFAULT true,
	`work_start` varchar(16) NOT NULL DEFAULT '10:00',
	`work_end` varchar(16) NOT NULL DEFAULT '22:00',
	`slot_minutes` int NOT NULL DEFAULT 30,
	`work_days` json,
	`active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `doctors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `erp_audit_log` (
	`id` varchar(36) NOT NULL,
	`table_name` varchar(128) NOT NULL,
	`action` varchar(64) NOT NULL,
	`record_id` varchar(64) NOT NULL DEFAULT '',
	`label` varchar(512) NOT NULL DEFAULT '',
	`changes` json DEFAULT ('{}'),
	`actor_id` varchar(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `erp_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `error_logs` (
	`id` varchar(36) NOT NULL,
	`message` text NOT NULL,
	`source` varchar(128) NOT NULL DEFAULT 'client',
	`path` varchar(512) NOT NULL DEFAULT '',
	`stack` text,
	`severity` varchar(32) NOT NULL DEFAULT 'error',
	`user_id` varchar(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `error_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` varchar(36) NOT NULL,
	`category` varchar(128) NOT NULL DEFAULT 'misc',
	`amount` decimal(12,2) NOT NULL DEFAULT '0',
	`note` text,
	`paid_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`created_by` varchar(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `generic_info` (
	`id` varchar(36) NOT NULL,
	`key` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL DEFAULT '',
	`name` varchar(512) NOT NULL DEFAULT '',
	`indications` text NOT NULL DEFAULT (''),
	`indications_en` text NOT NULL DEFAULT (''),
	`pharmacology` text NOT NULL DEFAULT (''),
	`pharmacology_en` text NOT NULL DEFAULT (''),
	`dosage` text NOT NULL DEFAULT (''),
	`dosage_en` text NOT NULL DEFAULT (''),
	`interaction` text NOT NULL DEFAULT (''),
	`interaction_en` text NOT NULL DEFAULT (''),
	`contraindications` text NOT NULL DEFAULT (''),
	`contraindications_en` text NOT NULL DEFAULT (''),
	`side_effects` text NOT NULL DEFAULT (''),
	`side_effects_en` text NOT NULL DEFAULT (''),
	`pregnancy` text NOT NULL DEFAULT (''),
	`pregnancy_en` text NOT NULL DEFAULT (''),
	`precautions` text NOT NULL DEFAULT (''),
	`precautions_en` text NOT NULL DEFAULT (''),
	`therapeutic_class` varchar(255) NOT NULL DEFAULT '',
	`therapeutic_class_en` varchar(255) NOT NULL DEFAULT '',
	`storage` text NOT NULL DEFAULT (''),
	`storage_en` text NOT NULL DEFAULT (''),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `generic_info_id` PRIMARY KEY(`id`),
	CONSTRAINT `generic_info_key_uidx` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `image_audit_log` (
	`id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`product_name` varchar(512) NOT NULL DEFAULT '',
	`action` varchar(64) NOT NULL,
	`field` varchar(32) NOT NULL DEFAULT 'box',
	`from_url` varchar(2048) NOT NULL DEFAULT '',
	`to_url` varchar(2048) NOT NULL DEFAULT '',
	`revision_id` varchar(36),
	`actor_id` varchar(36),
	`note` text NOT NULL DEFAULT (''),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `image_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `image_import_failures` (
	`id` varchar(36) NOT NULL,
	`run_id` varchar(36) NOT NULL,
	`product_id` varchar(64) NOT NULL DEFAULT '',
	`product_name` varchar(512) NOT NULL DEFAULT '',
	`source` varchar(128) NOT NULL DEFAULT '',
	`reason` text NOT NULL DEFAULT (''),
	`url` varchar(2048) NOT NULL DEFAULT '',
	`attempts` int NOT NULL DEFAULT 1,
	`resolved` boolean NOT NULL DEFAULT false,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `image_import_failures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `image_import_runs` (
	`id` varchar(36) NOT NULL,
	`source` varchar(128) NOT NULL DEFAULT '',
	`mode` varchar(64) NOT NULL DEFAULT 'manual',
	`status` varchar(32) NOT NULL DEFAULT 'running',
	`total` int NOT NULL DEFAULT 0,
	`ok_count` int NOT NULL DEFAULT 0,
	`fail_count` int NOT NULL DEFAULT 0,
	`skipped_count` int NOT NULL DEFAULT 0,
	`note` text NOT NULL DEFAULT (''),
	`finished_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `image_import_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `image_revisions` (
	`id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`product_name` varchar(512) NOT NULL DEFAULT '',
	`field` varchar(32) NOT NULL DEFAULT 'box',
	`before_url` varchar(2048) NOT NULL DEFAULT '',
	`after_url` varchar(2048) NOT NULL DEFAULT '',
	`method` varchar(64) NOT NULL DEFAULT 'manual',
	`source` varchar(255) NOT NULL DEFAULT '',
	`score` decimal(8,2) NOT NULL DEFAULT '0',
	`status` varchar(32) NOT NULL DEFAULT 'pending',
	`note` text NOT NULL DEFAULT (''),
	`reviewed_by` varchar(36),
	`reviewed_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `image_revisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `journal_entries` (
	`id` varchar(36) NOT NULL,
	`entry_no` varchar(64) NOT NULL,
	`entry_date` date NOT NULL,
	`memo` text NOT NULL DEFAULT (''),
	`source` varchar(64) NOT NULL DEFAULT 'manual',
	`ref` varchar(128) NOT NULL DEFAULT '',
	`total` decimal(14,2) NOT NULL DEFAULT '0',
	`created_by` varchar(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `journal_entries_id` PRIMARY KEY(`id`),
	CONSTRAINT `journal_entries_no_uidx` UNIQUE(`entry_no`)
);
--> statement-breakpoint
CREATE TABLE `journal_lines` (
	`id` varchar(36) NOT NULL,
	`entry_id` varchar(36) NOT NULL,
	`account_code` varchar(32) NOT NULL,
	`account_name` varchar(255) NOT NULL DEFAULT '',
	`debit` decimal(14,2) NOT NULL DEFAULT '0',
	`credit` decimal(14,2) NOT NULL DEFAULT '0',
	`note` text NOT NULL DEFAULT (''),
	`party` varchar(255) NOT NULL DEFAULT '',
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `journal_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lab_tests` (
	`id` varchar(64) NOT NULL,
	`bn` varchar(512) NOT NULL,
	`en` varchar(512) NOT NULL DEFAULT '',
	`price` decimal(12,2) NOT NULL DEFAULT '0',
	`mrp` decimal(12,2) NOT NULL DEFAULT '0',
	`grp` varchar(64) NOT NULL DEFAULT 'vital',
	`prep` text,
	`active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `lab_tests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `loyalty_accounts` (
	`user_id` varchar(36) NOT NULL,
	`points_earned` int NOT NULL DEFAULT 0,
	`points_spent` int NOT NULL DEFAULT 0,
	`balance` int NOT NULL DEFAULT 0,
	`tier` varchar(64) NOT NULL DEFAULT 'silver',
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `loyalty_accounts_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `loyalty_transactions` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`points` int NOT NULL,
	`kind` varchar(64) NOT NULL DEFAULT 'earn',
	`order_no` varchar(64) NOT NULL DEFAULT '',
	`reason` varchar(255) NOT NULL DEFAULT '',
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `loyalty_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `media_assets` (
	`id` varchar(36) NOT NULL,
	`url` varchar(2048) NOT NULL,
	`path` varchar(1024) NOT NULL DEFAULT '',
	`name` varchar(512) NOT NULL DEFAULT '',
	`kind` varchar(64) NOT NULL DEFAULT 'other',
	`tags` json NOT NULL,
	`size` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `media_assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`title` varchar(512) NOT NULL,
	`body` text NOT NULL DEFAULT (''),
	`kind` varchar(64) NOT NULL DEFAULT 'general',
	`order_no` varchar(64) NOT NULL DEFAULT '',
	`read` boolean NOT NULL DEFAULT false,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `offers` (
	`id` varchar(36) NOT NULL,
	`code` varchar(64),
	`title` varchar(255) NOT NULL,
	`title_en` varchar(255),
	`description` text,
	`discount_percent` decimal(5,2),
	`discount_amount` decimal(12,2),
	`active` boolean NOT NULL DEFAULT true,
	`starts_at` datetime(3),
	`ends_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `offers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_events` (
	`id` varchar(36) NOT NULL,
	`order_id` varchar(36) NOT NULL,
	`status` varchar(64) NOT NULL,
	`note` text NOT NULL DEFAULT (''),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `order_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` varchar(36) NOT NULL,
	`order_id` varchar(36) NOT NULL,
	`product_id` varchar(36),
	`name` varchar(512) NOT NULL,
	`qty` int NOT NULL DEFAULT 1,
	`unit_price` decimal(12,2) NOT NULL,
	`line_total` decimal(12,2) NOT NULL,
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_returns` (
	`id` varchar(36) NOT NULL,
	`order_id` varchar(36),
	`order_no` varchar(64) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`reason` varchar(128) NOT NULL,
	`details` text,
	`photo_urls` json DEFAULT ('[]'),
	`refund_amount` decimal(12,2) NOT NULL DEFAULT '0',
	`status` varchar(64) NOT NULL DEFAULT 'requested',
	`admin_note` text,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `order_returns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` varchar(36) NOT NULL,
	`order_no` varchar(64) NOT NULL,
	`user_id` varchar(36),
	`status` varchar(64) NOT NULL DEFAULT 'pending',
	`payment_method` varchar(64),
	`payment_status` varchar(64) DEFAULT 'pending',
	`payment_ref` varchar(128),
	`subtotal` decimal(12,2) NOT NULL DEFAULT '0',
	`discount` decimal(12,2) NOT NULL DEFAULT '0',
	`delivery_fee` decimal(12,2) NOT NULL DEFAULT '0',
	`total` decimal(12,2) NOT NULL DEFAULT '0',
	`customer_name` varchar(255),
	`customer_phone` varchar(32),
	`delivery_address` text,
	`area` varchar(128),
	`city_zone` varchar(128),
	`thana` varchar(128),
	`district` varchar(128),
	`lat` decimal(10,7),
	`lng` decimal(10,7),
	`slot` varchar(64),
	`notes` text,
	`meta` json,
	`public_token` varchar(64),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_order_no_unique` UNIQUE(`order_no`)
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`token_hash` varchar(255) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`used_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_sale_items` (
	`id` varchar(36) NOT NULL,
	`sale_id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`product_name` varchar(512) NOT NULL DEFAULT '',
	`price` decimal(12,2) NOT NULL DEFAULT '0',
	`qty` int NOT NULL DEFAULT 1,
	CONSTRAINT `pos_sale_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_sales` (
	`id` varchar(36) NOT NULL,
	`invoice_no` varchar(64) NOT NULL,
	`customer_name` varchar(255) NOT NULL DEFAULT '',
	`phone` varchar(32) NOT NULL DEFAULT '',
	`subtotal` decimal(12,2) NOT NULL DEFAULT '0',
	`discount` decimal(12,2) NOT NULL DEFAULT '0',
	`total` decimal(12,2) NOT NULL DEFAULT '0',
	`paid` decimal(12,2) NOT NULL DEFAULT '0',
	`due` decimal(12,2) NOT NULL DEFAULT '0',
	`method` varchar(64) NOT NULL DEFAULT 'cash',
	`note` text,
	`created_by` varchar(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `pos_sales_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prescription_audit` (
	`id` varchar(36) NOT NULL,
	`prescription_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`action` varchar(64) NOT NULL,
	`changes` json DEFAULT ('{}'),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `prescription_audit_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prescription_shares` (
	`id` varchar(36) NOT NULL,
	`prescription_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`token` varchar(64) NOT NULL,
	`scopes` json,
	`expires_at` datetime(3) NOT NULL,
	`revoked` boolean NOT NULL DEFAULT false,
	`views` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `prescription_shares_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prescriptions` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`guest_token` varchar(64),
	`status` varchar(64) NOT NULL DEFAULT 'pending',
	`phone` varchar(32),
	`note` text,
	`admin_note` text,
	`file_paths` json,
	`ocr_text` text,
	`ocr_json` json,
	`parsed_at` datetime(3),
	`parse_note` text,
	`notified_expiry` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `prescriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_image_audit` (
	`product_id` varchar(64) NOT NULL,
	`product_name` varchar(512) NOT NULL DEFAULT '',
	`box_url` varchar(2048) NOT NULL DEFAULT '',
	`medicine_url` varchar(2048) NOT NULL DEFAULT '',
	`status` varchar(64) NOT NULL DEFAULT 'unknown',
	`source` varchar(128) NOT NULL DEFAULT '',
	`note` text NOT NULL DEFAULT (''),
	`http_status` int,
	`checked_at` datetime(3),
	CONSTRAINT `product_image_audit_product_id` PRIMARY KEY(`product_id`)
);
--> statement-breakpoint
CREATE TABLE `product_image_map` (
	`id` varchar(36) NOT NULL,
	`product_id` varchar(64) NOT NULL,
	`url` varchar(2048) NOT NULL DEFAULT '',
	`medicine_url` varchar(2048) NOT NULL DEFAULT '',
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `product_image_map_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_image_map_product_uidx` UNIQUE(`product_id`)
);
--> statement-breakpoint
CREATE TABLE `product_reviews` (
	`id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`author_name` varchar(255),
	`rating` int NOT NULL DEFAULT 5,
	`comment` text,
	`verified` boolean NOT NULL DEFAULT false,
	`status` varchar(64) NOT NULL DEFAULT 'pending',
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `product_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` varchar(36) NOT NULL,
	`name` varchar(512) NOT NULL,
	`en` varchar(512),
	`base_name` varchar(512),
	`brand` varchar(255),
	`category` varchar(255),
	`generic` varchar(512),
	`form` varchar(128),
	`strength` varchar(128),
	`pack` varchar(128),
	`manufacturer` varchar(255),
	`price` decimal(12,2) NOT NULL DEFAULT '0',
	`mrp` decimal(12,2) NOT NULL DEFAULT '0',
	`stock` int NOT NULL DEFAULT 0,
	`low_stock_threshold` int NOT NULL DEFAULT 10,
	`rx` boolean NOT NULL DEFAULT false,
	`active` boolean NOT NULL DEFAULT true,
	`image_url` varchar(1024),
	`medicine_image_url` varchar(1024),
	`emoji` varchar(16),
	`description` text,
	`description_en` text,
	`indications` text,
	`indications_en` text,
	`dosage` text,
	`dosage_en` text,
	`side_effects` text,
	`side_effects_en` text,
	`contraindications` text,
	`contraindications_en` text,
	`precautions` text,
	`precautions_en` text,
	`pregnancy` text,
	`pregnancy_en` text,
	`storage` text,
	`storage_en` text,
	`therapeutic_class` varchar(255),
	`therapeutic_class_en` varchar(255),
	`rating` decimal(3,2) DEFAULT '0',
	`reviews` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` varchar(36) NOT NULL,
	`full_name` varchar(255),
	`phone` varchar(32),
	`address` text,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_order_items` (
	`id` varchar(36) NOT NULL,
	`po_id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`product_name` varchar(512) NOT NULL DEFAULT '',
	`qty` int NOT NULL DEFAULT 0,
	`received_qty` int NOT NULL DEFAULT 0,
	`cost` decimal(12,2) NOT NULL DEFAULT '0',
	`batch_no` varchar(128) NOT NULL DEFAULT '',
	`expiry` varchar(32),
	CONSTRAINT `purchase_order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` varchar(36) NOT NULL,
	`po_no` varchar(64) NOT NULL,
	`supplier_id` varchar(36) NOT NULL,
	`supplier_name` varchar(255) NOT NULL DEFAULT '',
	`status` varchar(64) NOT NULL DEFAULT 'ordered',
	`expected_at` datetime(3),
	`subtotal` decimal(12,2) NOT NULL DEFAULT '0',
	`discount` decimal(12,2) NOT NULL DEFAULT '0',
	`total` decimal(12,2) NOT NULL DEFAULT '0',
	`note` text,
	`received_at` datetime(3),
	`created_by` varchar(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `purchase_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `refill_reminders` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`product_id` varchar(64) NOT NULL,
	`product_name` varchar(512) NOT NULL,
	`every_days` int NOT NULL DEFAULT 30,
	`next_at` date NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`last_notified_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `refill_reminders_id` PRIMARY KEY(`id`),
	CONSTRAINT `refill_reminders_user_product_uidx` UNIQUE(`user_id`,`product_id`)
);
--> statement-breakpoint
CREATE TABLE `riders` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`name` varchar(255) NOT NULL DEFAULT '',
	`phone` varchar(32) NOT NULL DEFAULT '',
	`vehicle` varchar(64) NOT NULL DEFAULT 'bike',
	`zone` varchar(128) NOT NULL DEFAULT '',
	`active` boolean NOT NULL DEFAULT true,
	`last_lat` decimal(10,7),
	`last_lng` decimal(10,7),
	`last_seen_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `riders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rx_retention` (
	`user_id` varchar(36) NOT NULL,
	`days` int NOT NULL DEFAULT 365,
	`notify_email` boolean NOT NULL DEFAULT false,
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `rx_retention_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `service_requests` (
	`id` varchar(36) NOT NULL,
	`request_no` varchar(64) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`service_slug` varchar(120) NOT NULL DEFAULT '',
	`service_name` varchar(255) NOT NULL DEFAULT '',
	`patient_name` varchar(255) NOT NULL DEFAULT '',
	`phone` varchar(32) NOT NULL DEFAULT '',
	`address` text,
	`area` varchar(255) NOT NULL DEFAULT '',
	`city_zone` varchar(128) NOT NULL DEFAULT '',
	`thana` varchar(128) NOT NULL DEFAULT '',
	`district` varchar(128) NOT NULL DEFAULT '',
	`lat` decimal(10,7),
	`lng` decimal(10,7),
	`scheduled_date` varchar(32) NOT NULL DEFAULT '',
	`slot` varchar(128) NOT NULL DEFAULT '',
	`duration` varchar(64) NOT NULL DEFAULT '',
	`fee` decimal(12,2) NOT NULL DEFAULT '0',
	`payment_method` varchar(64) NOT NULL DEFAULT 'cod',
	`payment_status` varchar(64) NOT NULL DEFAULT 'pending',
	`status` varchar(64) NOT NULL DEFAULT 'requested',
	`assignee_name` varchar(255) NOT NULL DEFAULT '',
	`assignee_phone` varchar(32) NOT NULL DEFAULT '',
	`note` text,
	`admin_note` text,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `service_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_adjustment_items` (
	`id` varchar(36) NOT NULL,
	`adj_id` varchar(36) NOT NULL,
	`product_id` varchar(64) NOT NULL,
	`product_name` varchar(512) NOT NULL DEFAULT '',
	`change` int NOT NULL DEFAULT 0,
	`before_qty` int NOT NULL DEFAULT 0,
	`after_qty` int NOT NULL DEFAULT 0,
	`note` text NOT NULL DEFAULT (''),
	CONSTRAINT `stock_adjustment_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_adjustments` (
	`id` varchar(36) NOT NULL,
	`adj_no` varchar(64) NOT NULL,
	`reason` varchar(64) NOT NULL DEFAULT 'correction',
	`note` text NOT NULL DEFAULT (''),
	`status` varchar(32) NOT NULL DEFAULT 'applied',
	`branch_id` varchar(36),
	`created_by` varchar(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `stock_adjustments_id` PRIMARY KEY(`id`),
	CONSTRAINT `stock_adjustments_no_uidx` UNIQUE(`adj_no`)
);
--> statement-breakpoint
CREATE TABLE `stock_alerts` (
	`id` varchar(36) NOT NULL,
	`kind` varchar(64) NOT NULL,
	`ref` varchar(255) NOT NULL DEFAULT '',
	`product_id` varchar(36) NOT NULL DEFAULT '',
	`product_name` varchar(512) NOT NULL DEFAULT '',
	`detail` text NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `stock_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_batches` (
	`id` varchar(36) NOT NULL,
	`product_id` varchar(64) NOT NULL,
	`product_name` varchar(512) NOT NULL DEFAULT '',
	`batch_no` varchar(128) NOT NULL DEFAULT '',
	`expiry` date,
	`qty` int NOT NULL DEFAULT 0,
	`cost` decimal(12,2) NOT NULL DEFAULT '0',
	`supplier_id` varchar(36),
	`po_id` varchar(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `stock_batches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_count_items` (
	`id` varchar(36) NOT NULL,
	`count_id` varchar(36) NOT NULL,
	`product_id` varchar(64) NOT NULL,
	`product_name` varchar(512) NOT NULL DEFAULT '',
	`system_qty` int NOT NULL DEFAULT 0,
	`counted_qty` int NOT NULL DEFAULT 0,
	`note` text NOT NULL DEFAULT (''),
	CONSTRAINT `stock_count_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_counts` (
	`id` varchar(36) NOT NULL,
	`count_no` varchar(64) NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`note` text NOT NULL DEFAULT (''),
	`branch_id` varchar(36),
	`created_by` varchar(36),
	`applied_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `stock_counts_id` PRIMARY KEY(`id`),
	CONSTRAINT `stock_counts_no_uidx` UNIQUE(`count_no`)
);
--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`product_name` varchar(512) NOT NULL DEFAULT '',
	`change` int NOT NULL,
	`balance` int NOT NULL DEFAULT 0,
	`kind` varchar(64) NOT NULL DEFAULT 'adjust',
	`ref` varchar(128) NOT NULL DEFAULT '',
	`note` text,
	`actor_id` varchar(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `stock_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_transfer_items` (
	`id` varchar(36) NOT NULL,
	`transfer_id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`product_name` varchar(512) NOT NULL DEFAULT '',
	`qty` int NOT NULL DEFAULT 1,
	CONSTRAINT `stock_transfer_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_transfers` (
	`id` varchar(36) NOT NULL,
	`transfer_no` varchar(64) NOT NULL,
	`from_branch_id` varchar(36),
	`to_branch_id` varchar(36),
	`from_branch_name` varchar(255) NOT NULL DEFAULT '',
	`to_branch_name` varchar(255) NOT NULL DEFAULT '',
	`status` varchar(64) NOT NULL DEFAULT 'draft',
	`note` text,
	`created_by` varchar(36),
	`sent_at` datetime(3),
	`received_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `stock_transfers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`contact_person` varchar(255) NOT NULL DEFAULT '',
	`phone` varchar(32) NOT NULL DEFAULT '',
	`email` varchar(255) NOT NULL DEFAULT '',
	`address` text,
	`payment_terms` varchar(255) NOT NULL DEFAULT '',
	`active` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `support_conversations` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL DEFAULT '',
	`status` varchar(64) NOT NULL DEFAULT 'open',
	`agent_name` varchar(255) NOT NULL DEFAULT '',
	`agent_id` varchar(36),
	`agent_active` boolean NOT NULL DEFAULT false,
	`agent_last_seen` datetime(3),
	`last_message_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`unread_for_agent` int NOT NULL DEFAULT 0,
	`unread_for_user` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `support_conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `support_messages` (
	`id` varchar(36) NOT NULL,
	`conversation_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`sender` varchar(32) NOT NULL DEFAULT 'user',
	`body` text NOT NULL,
	`agent_name` varchar(255) NOT NULL DEFAULT '',
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `support_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_favorites` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `user_favorites_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_favorites_user_product_uidx` UNIQUE(`user_id`,`product_id`)
);
--> statement-breakpoint
CREATE TABLE `user_recent_medicines` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`last_viewed_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `user_recent_medicines_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_recent_medicines_user_product_uidx` UNIQUE(`user_id`,`product_id`)
);
--> statement-breakpoint
CREATE TABLE `user_roles` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`role` enum('super_admin','admin','erp_manager','support_agent','accountant','pharmacist','rider','user') NOT NULL DEFAULT 'user',
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `user_roles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`email_verified` datetime(3),
	`name` varchar(255),
	`image` varchar(512),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `consultation_media` ADD CONSTRAINT `consultation_media_appointment_id_appointments_id_fk` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `consultation_messages` ADD CONSTRAINT `consultation_messages_appointment_id_appointments_id_fk` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `consultation_prescriptions` ADD CONSTRAINT `consultation_prescriptions_appointment_id_appointments_id_fk` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `deliveries` ADD CONSTRAINT `deliveries_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `deliveries` ADD CONSTRAINT `deliveries_rider_id_riders_id_fk` FOREIGN KEY (`rider_id`) REFERENCES `riders`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `diagnostic_bookings` ADD CONSTRAINT `diagnostic_bookings_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `doctor_reviews` ADD CONSTRAINT `doctor_reviews_appointment_id_appointments_id_fk` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `journal_lines` ADD CONSTRAINT `journal_lines_entry_id_journal_entries_id_fk` FOREIGN KEY (`entry_id`) REFERENCES `journal_entries`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `loyalty_accounts` ADD CONSTRAINT `loyalty_accounts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `loyalty_transactions` ADD CONSTRAINT `loyalty_transactions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_events` ADD CONSTRAINT `order_events_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_returns` ADD CONSTRAINT `order_returns_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_returns` ADD CONSTRAINT `order_returns_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pos_sale_items` ADD CONSTRAINT `pos_sale_items_sale_id_pos_sales_id_fk` FOREIGN KEY (`sale_id`) REFERENCES `pos_sales`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prescription_shares` ADD CONSTRAINT `prescription_shares_prescription_id_prescriptions_id_fk` FOREIGN KEY (`prescription_id`) REFERENCES `prescriptions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prescriptions` ADD CONSTRAINT `prescriptions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_reviews` ADD CONSTRAINT `product_reviews_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_reviews` ADD CONSTRAINT `product_reviews_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `profiles` ADD CONSTRAINT `profiles_id_users_id_fk` FOREIGN KEY (`id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_po_id_purchase_orders_id_fk` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_supplier_id_suppliers_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `refill_reminders` ADD CONSTRAINT `refill_reminders_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `service_requests` ADD CONSTRAINT `service_requests_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_adjustment_items` ADD CONSTRAINT `stock_adjustment_items_adj_id_stock_adjustments_id_fk` FOREIGN KEY (`adj_id`) REFERENCES `stock_adjustments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_count_items` ADD CONSTRAINT `stock_count_items_count_id_stock_counts_id_fk` FOREIGN KEY (`count_id`) REFERENCES `stock_counts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_transfer_items` ADD CONSTRAINT `stock_transfer_items_transfer_id_stock_transfers_id_fk` FOREIGN KEY (`transfer_id`) REFERENCES `stock_transfers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_transfers` ADD CONSTRAINT `stock_transfers_from_branch_id_branches_id_fk` FOREIGN KEY (`from_branch_id`) REFERENCES `branches`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_transfers` ADD CONSTRAINT `stock_transfers_to_branch_id_branches_id_fk` FOREIGN KEY (`to_branch_id`) REFERENCES `branches`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_conversations` ADD CONSTRAINT `support_conversations_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_messages` ADD CONSTRAINT `support_messages_conversation_id_support_conversations_id_fk` FOREIGN KEY (`conversation_id`) REFERENCES `support_conversations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_favorites` ADD CONSTRAINT `user_favorites_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_favorites` ADD CONSTRAINT `user_favorites_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_recent_medicines` ADD CONSTRAINT `user_recent_medicines_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_recent_medicines` ADD CONSTRAINT `user_recent_medicines_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `api_endpoints_grp_idx` ON `api_endpoints` (`grp`);--> statement-breakpoint
CREATE INDEX `api_test_logs_created_idx` ON `api_test_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `appointment_reminders_appt_idx` ON `appointment_reminders` (`appointment_id`);--> statement-breakpoint
CREATE INDEX `appointment_reminders_status_idx` ON `appointment_reminders` (`status`);--> statement-breakpoint
CREATE INDEX `appointments_user_idx` ON `appointments` (`user_id`);--> statement-breakpoint
CREATE INDEX `appointments_doctor_idx` ON `appointments` (`doctor_id`);--> statement-breakpoint
CREATE INDEX `appointments_scheduled_idx` ON `appointments` (`scheduled_at`);--> statement-breakpoint
CREATE INDEX `branches_code_idx` ON `branches` (`code`);--> statement-breakpoint
CREATE INDEX `branches_active_idx` ON `branches` (`active`);--> statement-breakpoint
CREATE INDEX `campaign_sends_created_idx` ON `campaign_sends` (`created_at`);--> statement-breakpoint
CREATE INDEX `chart_accounts_kind_idx` ON `chart_accounts` (`kind`);--> statement-breakpoint
CREATE INDEX `consultation_media_appt_idx` ON `consultation_media` (`appointment_id`);--> statement-breakpoint
CREATE INDEX `consultation_messages_appt_idx` ON `consultation_messages` (`appointment_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `consultation_rx_appt_idx` ON `consultation_prescriptions` (`appointment_id`);--> statement-breakpoint
CREATE INDEX `deliveries_order_idx` ON `deliveries` (`order_id`);--> statement-breakpoint
CREATE INDEX `deliveries_rider_idx` ON `deliveries` (`rider_id`);--> statement-breakpoint
CREATE INDEX `deliveries_status_idx` ON `deliveries` (`status`);--> statement-breakpoint
CREATE INDEX `deliveries_public_token_idx` ON `deliveries` (`public_token`);--> statement-breakpoint
CREATE INDEX `delivery_events_delivery_idx` ON `delivery_events` (`delivery_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `delivery_notifications_delivery_idx` ON `delivery_notifications` (`delivery_id`);--> statement-breakpoint
CREATE INDEX `delivery_notifications_user_idx` ON `delivery_notifications` (`user_id`);--> statement-breakpoint
CREATE INDEX `delivery_zones_active_idx` ON `delivery_zones` (`active`);--> statement-breakpoint
CREATE INDEX `delivery_zones_sort_idx` ON `delivery_zones` (`sort_order`);--> statement-breakpoint
CREATE INDEX `diag_bookings_user_idx` ON `diagnostic_bookings` (`user_id`);--> statement-breakpoint
CREATE INDEX `diag_bookings_status_idx` ON `diagnostic_bookings` (`status`);--> statement-breakpoint
CREATE INDEX `diag_bookings_no_idx` ON `diagnostic_bookings` (`booking_no`);--> statement-breakpoint
CREATE INDEX `doctor_blackouts_doctor_idx` ON `doctor_blackouts` (`doctor_id`);--> statement-breakpoint
CREATE INDEX `doctor_blackouts_day_idx` ON `doctor_blackouts` (`day`);--> statement-breakpoint
CREATE INDEX `doctor_reviews_doctor_idx` ON `doctor_reviews` (`doctor_id`);--> statement-breakpoint
CREATE INDEX `doctor_reviews_appt_idx` ON `doctor_reviews` (`appointment_id`);--> statement-breakpoint
CREATE INDEX `doctors_active_idx` ON `doctors` (`active`);--> statement-breakpoint
CREATE INDEX `erp_audit_created_idx` ON `erp_audit_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `error_logs_created_idx` ON `error_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `expenses_paid_idx` ON `expenses` (`paid_at`);--> statement-breakpoint
CREATE INDEX `image_audit_log_created_idx` ON `image_audit_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `image_audit_log_product_idx` ON `image_audit_log` (`product_id`);--> statement-breakpoint
CREATE INDEX `image_import_failures_run_idx` ON `image_import_failures` (`run_id`);--> statement-breakpoint
CREATE INDEX `image_import_failures_resolved_idx` ON `image_import_failures` (`resolved`);--> statement-breakpoint
CREATE INDEX `image_import_runs_created_idx` ON `image_import_runs` (`created_at`);--> statement-breakpoint
CREATE INDEX `image_revisions_status_idx` ON `image_revisions` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `image_revisions_product_idx` ON `image_revisions` (`product_id`);--> statement-breakpoint
CREATE INDEX `journal_entries_date_idx` ON `journal_entries` (`entry_date`);--> statement-breakpoint
CREATE INDEX `journal_lines_entry_idx` ON `journal_lines` (`entry_id`);--> statement-breakpoint
CREATE INDEX `journal_lines_account_idx` ON `journal_lines` (`account_code`);--> statement-breakpoint
CREATE INDEX `lab_tests_active_idx` ON `lab_tests` (`active`);--> statement-breakpoint
CREATE INDEX `loyalty_tx_user_idx` ON `loyalty_transactions` (`user_id`);--> statement-breakpoint
CREATE INDEX `media_assets_kind_idx` ON `media_assets` (`kind`);--> statement-breakpoint
CREATE INDEX `media_assets_created_idx` ON `media_assets` (`created_at`);--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`user_id`);--> statement-breakpoint
CREATE INDEX `notifications_kind_idx` ON `notifications` (`kind`);--> statement-breakpoint
CREATE INDEX `notifications_created_idx` ON `notifications` (`created_at`);--> statement-breakpoint
CREATE INDEX `order_events_order_idx` ON `order_events` (`order_id`);--> statement-breakpoint
CREATE INDEX `order_events_created_idx` ON `order_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE INDEX `order_returns_user_idx` ON `order_returns` (`user_id`);--> statement-breakpoint
CREATE INDEX `order_returns_order_idx` ON `order_returns` (`order_id`);--> statement-breakpoint
CREATE INDEX `order_returns_status_idx` ON `order_returns` (`status`);--> statement-breakpoint
CREATE INDEX `orders_user_idx` ON `orders` (`user_id`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `orders_public_token_idx` ON `orders` (`public_token`);--> statement-breakpoint
CREATE INDEX `pos_sale_items_sale_idx` ON `pos_sale_items` (`sale_id`);--> statement-breakpoint
CREATE INDEX `pos_sales_invoice_idx` ON `pos_sales` (`invoice_no`);--> statement-breakpoint
CREATE INDEX `pos_sales_created_idx` ON `pos_sales` (`created_at`);--> statement-breakpoint
CREATE INDEX `prescription_audit_rx_idx` ON `prescription_audit` (`prescription_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `prescription_shares_token_idx` ON `prescription_shares` (`token`);--> statement-breakpoint
CREATE INDEX `prescription_shares_rx_idx` ON `prescription_shares` (`prescription_id`);--> statement-breakpoint
CREATE INDEX `prescriptions_user_idx` ON `prescriptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `prescriptions_guest_token_idx` ON `prescriptions` (`guest_token`);--> statement-breakpoint
CREATE INDEX `prescriptions_status_idx` ON `prescriptions` (`status`);--> statement-breakpoint
CREATE INDEX `product_image_audit_status_idx` ON `product_image_audit` (`status`);--> statement-breakpoint
CREATE INDEX `product_reviews_product_idx` ON `product_reviews` (`product_id`);--> statement-breakpoint
CREATE INDEX `product_reviews_user_idx` ON `product_reviews` (`user_id`);--> statement-breakpoint
CREATE INDEX `product_reviews_status_idx` ON `product_reviews` (`status`);--> statement-breakpoint
CREATE INDEX `products_category_idx` ON `products` (`category`);--> statement-breakpoint
CREATE INDEX `products_generic_idx` ON `products` (`generic`);--> statement-breakpoint
CREATE INDEX `products_active_idx` ON `products` (`active`);--> statement-breakpoint
CREATE INDEX `products_base_name_idx` ON `products` (`base_name`);--> statement-breakpoint
CREATE INDEX `products_brand_idx` ON `products` (`brand`);--> statement-breakpoint
CREATE INDEX `products_manufacturer_idx` ON `products` (`manufacturer`);--> statement-breakpoint
CREATE INDEX `products_therapeutic_class_idx` ON `products` (`therapeutic_class`);--> statement-breakpoint
CREATE INDEX `purchase_order_items_po_idx` ON `purchase_order_items` (`po_id`);--> statement-breakpoint
CREATE INDEX `purchase_orders_po_no_idx` ON `purchase_orders` (`po_no`);--> statement-breakpoint
CREATE INDEX `purchase_orders_status_idx` ON `purchase_orders` (`status`);--> statement-breakpoint
CREATE INDEX `refill_reminders_next_idx` ON `refill_reminders` (`next_at`);--> statement-breakpoint
CREATE INDEX `riders_active_idx` ON `riders` (`active`);--> statement-breakpoint
CREATE INDEX `service_requests_user_idx` ON `service_requests` (`user_id`);--> statement-breakpoint
CREATE INDEX `service_requests_status_idx` ON `service_requests` (`status`);--> statement-breakpoint
CREATE INDEX `stock_adjustment_items_adj_idx` ON `stock_adjustment_items` (`adj_id`);--> statement-breakpoint
CREATE INDEX `stock_adjustments_created_idx` ON `stock_adjustments` (`created_at`);--> statement-breakpoint
CREATE INDEX `stock_alerts_created_idx` ON `stock_alerts` (`created_at`);--> statement-breakpoint
CREATE INDEX `stock_batches_product_idx` ON `stock_batches` (`product_id`);--> statement-breakpoint
CREATE INDEX `stock_batches_expiry_idx` ON `stock_batches` (`expiry`);--> statement-breakpoint
CREATE INDEX `stock_count_items_count_idx` ON `stock_count_items` (`count_id`);--> statement-breakpoint
CREATE INDEX `stock_counts_status_idx` ON `stock_counts` (`status`);--> statement-breakpoint
CREATE INDEX `stock_movements_product_idx` ON `stock_movements` (`product_id`);--> statement-breakpoint
CREATE INDEX `stock_transfer_items_transfer_idx` ON `stock_transfer_items` (`transfer_id`);--> statement-breakpoint
CREATE INDEX `stock_transfers_status_idx` ON `stock_transfers` (`status`);--> statement-breakpoint
CREATE INDEX `stock_transfers_no_idx` ON `stock_transfers` (`transfer_no`);--> statement-breakpoint
CREATE INDEX `suppliers_name_idx` ON `suppliers` (`name`);--> statement-breakpoint
CREATE INDEX `support_conversations_user_idx` ON `support_conversations` (`user_id`);--> statement-breakpoint
CREATE INDEX `support_conversations_last_idx` ON `support_conversations` (`last_message_at`);--> statement-breakpoint
CREATE INDEX `support_messages_conv_idx` ON `support_messages` (`conversation_id`);--> statement-breakpoint
CREATE INDEX `user_favorites_user_idx` ON `user_favorites` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_recent_medicines_user_idx` ON `user_recent_medicines` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_recent_medicines_viewed_idx` ON `user_recent_medicines` (`last_viewed_at`);--> statement-breakpoint
CREATE INDEX `user_roles_user_idx` ON `user_roles` (`user_id`);