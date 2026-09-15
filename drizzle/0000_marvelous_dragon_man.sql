CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`details` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `incidents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`incident_number` text NOT NULL,
	`incident_code` text,
	`beneficiary_name` text,
	`gender` text NOT NULL,
	`contact` text,
	`age` integer,
	`urgency` text NOT NULL,
	`category` text NOT NULL,
	`case_type` text NOT NULL,
	`pickup_type` text,
	`pickup_location` text,
	`pickup_governorate` text NOT NULL,
	`pickup_municipality` text,
	`pickup_neighborhood` text,
	`dropoff_type` text,
	`dropoff_location` text,
	`shift` text NOT NULL,
	`station` text NOT NULL,
	`vehicle` text,
	`km_start` real,
	`km_end` real,
	`distance_km` real DEFAULT 0 NOT NULL,
	`call_date` text NOT NULL,
	`call_time` text NOT NULL,
	`dispatch_time` text,
	`arrival_time` text,
	`clear_time` text,
	`response_minutes` integer DEFAULT 0 NOT NULL,
	`service_minutes` integer DEFAULT 0 NOT NULL,
	`crew` text,
	`interventions` text,
	`fuel_liters` real DEFAULT 0 NOT NULL,
	`notes` text,
	`created_by` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `incidents_incident_number_unique` ON `incidents` (`incident_number`);--> statement-breakpoint
CREATE TABLE `staff` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`full_name` text NOT NULL,
	`station_id` integer,
	`qualification` text,
	`active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`station_id`) REFERENCES `stations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `stations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`governorate` text NOT NULL,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stations_code_unique` ON `stations` (`code`);--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`external_user_id` text NOT NULL,
	`email` text,
	`full_name` text,
	`role` text DEFAULT 'viewer' NOT NULL,
	`station` text,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_profiles_external_user_id_unique` ON `user_profiles` (`external_user_id`);--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plate_number` text NOT NULL,
	`station_id` integer,
	`manufacturer` text,
	`model` text,
	`production_year` integer,
	`fuel_type` text,
	`ambulance_type` text,
	`active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`station_id`) REFERENCES `stations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vehicles_plate_number_unique` ON `vehicles` (`plate_number`);