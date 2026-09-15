ALTER TABLE `incidents` ADD `dispatch_date` text;--> statement-breakpoint
ALTER TABLE `incidents` ADD `on_scene_date` text;--> statement-breakpoint
ALTER TABLE `incidents` ADD `hospital_date` text;--> statement-breakpoint
ALTER TABLE `incidents` ADD `hospital_time` text;--> statement-breakpoint
ALTER TABLE `incidents` ADD `available_date` text;--> statement-breakpoint
ALTER TABLE `incidents` ADD `dispatcher_primary` text;--> statement-breakpoint
ALTER TABLE `incidents` ADD `dispatcher_secondary` text;--> statement-breakpoint
ALTER TABLE `incidents` ADD `emt_driver` text;--> statement-breakpoint
ALTER TABLE `incidents` ADD `emt_lead` text;--> statement-breakpoint
ALTER TABLE `incidents` ADD `emt_assist` text;--> statement-breakpoint
ALTER TABLE `incidents` ADD `chief_complaint` text;--> statement-breakpoint
ALTER TABLE `incidents` ADD `cancelled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `incidents` ADD `patient_deceased` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `incidents` ADD `conflict_related` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `incidents` ADD `oxygen` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `incidents` ADD `bvm` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `incidents` ADD `airway` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `incidents` ADD `cpr` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `incidents` ADD `aed` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `incidents` ADD `drugs` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `incidents` ADD `wound_care` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `incidents` ADD `tourniquet` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `incidents` ADD `immobilization` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `incidents` ADD `cervical_collar` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `incidents` ADD `glucose_check` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `incidents` ADD `splinting` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `incidents` ADD `delivery` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `incidents` ADD `source_import_key` text;--> statement-breakpoint
ALTER TABLE `incidents` ADD `source_incident_number` text;--> statement-breakpoint
ALTER TABLE `incidents` ADD `source_incident_code` text;--> statement-breakpoint
ALTER TABLE `incidents` ADD `import_batch` text;--> statement-breakpoint
ALTER TABLE `incidents` ADD `data_quality_status` text DEFAULT 'ok' NOT NULL;--> statement-breakpoint
ALTER TABLE `incidents` ADD `data_quality_notes` text;--> statement-breakpoint
CREATE UNIQUE INDEX `incidents_source_import_key_unique` ON `incidents` (`source_import_key`);