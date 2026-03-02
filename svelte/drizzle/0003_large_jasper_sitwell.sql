CREATE TABLE `prompts` (
	`id` varchar(36) NOT NULL,
	`label` varchar(255) NOT NULL,
	`kind` varchar(64) NOT NULL,
	`content` text NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `prompts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `locations` MODIFY COLUMN `regionId` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `locations` MODIFY COLUMN `municipalityId` varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE `prompts` ADD CONSTRAINT `prompts_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `prompts_userId_idx` ON `prompts` (`user_id`);