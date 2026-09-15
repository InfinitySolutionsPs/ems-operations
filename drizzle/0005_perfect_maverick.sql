CREATE TABLE `fuel_fillings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`vehicle_id` integer NOT NULL,
	`incident_id` integer,
	`filled_at` text NOT NULL,
	`liters` real NOT NULL,
	`fuel_type` text NOT NULL,
	`odometer_km` real,
	`driver_staff_id` integer,
	`driver_name` text,
	`filled_by_staff_id` integer,
	`filled_by_name` text NOT NULL,
	`source_name` text,
	`voucher_number` text,
	`notes` text,
	`created_by` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`incident_id`) REFERENCES `incidents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`driver_staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`filled_by_staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `vehicle_movements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`vehicle_id` integer NOT NULL,
	`incident_id` integer,
	`driver_staff_id` integer,
	`driver_name` text,
	`departed_at` text NOT NULL,
	`returned_at` text,
	`km_start` real NOT NULL,
	`km_end` real,
	`destination` text,
	`notes` text,
	`created_by` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`incident_id`) REFERENCES `incidents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`driver_staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `vehicles` ADD `service_status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `out_of_service_reason` text;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `work_location` text;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `fleet_source_row` integer;