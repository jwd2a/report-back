CREATE TABLE `contributions` (
	`document_id` text NOT NULL,
	`scope` text NOT NULL,
	`label` text NOT NULL,
	`position` integer NOT NULL,
	`markdown` text DEFAULT '' NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`updated` text,
	PRIMARY KEY(`document_id`, `scope`),
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`title` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `documents_owner` ON `documents` (`owner`);--> statement-breakpoint
CREATE TABLE `keys` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`scope` text,
	`label` text NOT NULL,
	`hash` text NOT NULL,
	`created` text NOT NULL,
	`revoked` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `keys_hash_unique` ON `keys` (`hash`);--> statement-breakpoint
CREATE INDEX `keys_document` ON `keys` (`document_id`);--> statement-breakpoint
CREATE TABLE `revisions` (
	`document_id` text NOT NULL,
	`scope` text NOT NULL,
	`revision` integer NOT NULL,
	`markdown` text NOT NULL,
	`updated` text NOT NULL,
	`actor` text NOT NULL,
	PRIMARY KEY(`document_id`, `scope`, `revision`)
);
