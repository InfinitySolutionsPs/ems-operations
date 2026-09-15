CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recipient` text,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`type` text DEFAULT 'info' NOT NULL,
	`entity_type` text,
	`entity_id` text,
	`is_read` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `system_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text,
	`label` text NOT NULL,
	`category` text DEFAULT 'general' NOT NULL,
	`updated_by` text,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
ALTER TABLE `incidents` ADD `approval_status` text DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE `incidents` ADD `approved_by` text;--> statement-breakpoint
ALTER TABLE `incidents` ADD `approved_at` text;--> statement-breakpoint
ALTER TABLE `incidents` ADD `rejection_reason` text;