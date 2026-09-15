CREATE TABLE `coordinations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_key` text,
	`sequence_number` integer,
	`coordination_date` text NOT NULL,
	`coordinating_agency` text NOT NULL,
	`vehicle_count` integer DEFAULT 0 NOT NULL,
	`coordination_type` text NOT NULL,
	`result_description` text,
	`ambulance_patients` integer DEFAULT 0 NOT NULL,
	`ambulance_companions` integer DEFAULT 0 NOT NULL,
	`bus_patients` integer DEFAULT 0 NOT NULL,
	`coordination_status` text DEFAULT 'نجح' NOT NULL,
	`participating_vehicles` text,
	`notes_patients` integer DEFAULT 0 NOT NULL,
	`notes_companions` integer DEFAULT 0 NOT NULL,
	`notes_total` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`created_by` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coordinations_source_key_unique` ON `coordinations` (`source_key`);