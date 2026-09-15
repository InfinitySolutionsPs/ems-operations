CREATE TABLE `operational_assignments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`work_date` text NOT NULL,
	`staff_id` integer NOT NULL,
	`station_id` integer NOT NULL,
	`shift` text NOT NULL,
	`duty_type` text DEFAULT 'دوام مركز' NOT NULL,
	`vehicle_id` integer,
	`work_location` text,
	`attendance_status` text DEFAULT 'حاضر' NOT NULL,
	`notes` text,
	`created_by` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`station_id`) REFERENCES `stations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `staff` ADD `cadre_type` text DEFAULT 'كادر' NOT NULL;--> statement-breakpoint
ALTER TABLE `staff` ADD `job_title` text;--> statement-breakpoint
ALTER TABLE `staff` ADD `detail` text;