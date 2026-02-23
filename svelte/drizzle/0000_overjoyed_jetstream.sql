CREATE TABLE `jobs` (
	`id` varchar(64) NOT NULL,
	`headline` text,
	`employer_name` text,
	`municipality` text,
	`region` text,
	`webpage_url` text,
	`publication_date` datetime,
	`application_deadline` date,
	`description` longtext,
	`fetched_at` timestamp DEFAULT (now()),
	CONSTRAINT `jobs_id` PRIMARY KEY(`id`)
);
