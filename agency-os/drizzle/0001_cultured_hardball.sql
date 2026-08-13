CREATE TABLE `clientContacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`userId` int,
	`name` varchar(256) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(48),
	`isPrimary` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clientContacts_id` PRIMARY KEY(`id`),
	CONSTRAINT `client_contacts_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publicId` varchar(32) NOT NULL,
	`companyName` varchar(256) NOT NULL,
	`status` enum('lead','active','archived') NOT NULL DEFAULT 'lead',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`),
	CONSTRAINT `clients_public_id_unique` UNIQUE(`publicId`)
);
--> statement-breakpoint
CREATE TABLE `deliverables` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`assignedTo` varchar(256),
	`status` enum('planned','in_progress','client_review','complete') NOT NULL DEFAULT 'planned',
	`dueAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `deliverables_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`projectId` int,
	`documentType` enum('contract','nda','sow') NOT NULL,
	`title` varchar(256) NOT NULL,
	`status` enum('draft','sent','awaiting_signature','signed','declined') NOT NULL DEFAULT 'draft',
	`signatureRequestedAt` timestamp,
	`signedAt` timestamp,
	`signatureReference` varchar(256),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoiceItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceId` int NOT NULL,
	`description` varchar(512) NOT NULL,
	`quantity` int NOT NULL,
	`unitAmountPaise` int NOT NULL,
	`totalAmountPaise` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invoiceItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`projectId` int,
	`invoiceNumber` varchar(64) NOT NULL,
	`status` enum('draft','issued','paid','overdue','void') NOT NULL DEFAULT 'draft',
	`issuedAt` timestamp,
	`dueAt` timestamp NOT NULL,
	`paidAt` timestamp,
	`subtotalPaise` int NOT NULL DEFAULT 0,
	`gstPaise` int NOT NULL DEFAULT 0,
	`totalPaise` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoices_number_unique` UNIQUE(`invoiceNumber`)
);
--> statement-breakpoint
CREATE TABLE `legalAcceptances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`clientContactId` int NOT NULL,
	`policyType` enum('terms','privacy','cookies','service_agreement') NOT NULL,
	`documentVersion` varchar(64) NOT NULL,
	`acceptedByName` varchar(256) NOT NULL,
	`acceptedByEmail` varchar(320) NOT NULL,
	`acceptedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `legalAcceptances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipientUserId` int,
	`clientId` int,
	`recipientRole` enum('admin','client') NOT NULL,
	`notificationType` enum('onboarding_complete','legal_accepted','invoice_paid','invoice_issued','document_ready','document_signed') NOT NULL,
	`title` varchar(256) NOT NULL,
	`message` text NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `onboardingSubmissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publicId` varchar(32) NOT NULL,
	`clientId` int NOT NULL,
	`clientContactId` int NOT NULL,
	`serviceType` enum('website','internal_tool','brand_identity','performance_media','ecommerce') NOT NULL,
	`preferredTimeline` varchar(256),
	`projectBrief` text NOT NULL,
	`deliverables` text,
	`stage` enum('legal_pending','complete') NOT NULL DEFAULT 'legal_pending',
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `onboardingSubmissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `onboarding_public_id_unique` UNIQUE(`publicId`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`status` enum('discovery','in_progress','client_review','complete') NOT NULL DEFAULT 'discovery',
	`deadline` timestamp,
	`assignedTo` varchar(256),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `storedFiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`documentId` int,
	`invoiceId` int,
	`fileKind` enum('document_source','signed_document','invoice_pdf') NOT NULL,
	`filename` varchar(512) NOT NULL,
	`contentType` varchar(128) NOT NULL,
	`storageKey` varchar(1024) NOT NULL,
	`storageUrl` varchar(1200) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `storedFiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `clientContacts` ADD CONSTRAINT `clientContacts_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clientContacts` ADD CONSTRAINT `clientContacts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `deliverables` ADD CONSTRAINT `deliverables_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoiceItems` ADD CONSTRAINT `invoiceItems_invoiceId_invoices_id_fk` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `legalAcceptances` ADD CONSTRAINT `legalAcceptances_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `legalAcceptances` ADD CONSTRAINT `legalAcceptances_clientContactId_clientContacts_id_fk` FOREIGN KEY (`clientContactId`) REFERENCES `clientContacts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_recipientUserId_users_id_fk` FOREIGN KEY (`recipientUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `onboardingSubmissions` ADD CONSTRAINT `onboardingSubmissions_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `onboardingSubmissions` ADD CONSTRAINT `onboardingSubmissions_clientContactId_clientContacts_id_fk` FOREIGN KEY (`clientContactId`) REFERENCES `clientContacts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `storedFiles` ADD CONSTRAINT `storedFiles_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `storedFiles` ADD CONSTRAINT `storedFiles_documentId_documents_id_fk` FOREIGN KEY (`documentId`) REFERENCES `documents`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `storedFiles` ADD CONSTRAINT `storedFiles_invoiceId_invoices_id_fk` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `client_contacts_client_id_idx` ON `clientContacts` (`clientId`);--> statement-breakpoint
CREATE INDEX `client_contacts_email_idx` ON `clientContacts` (`email`);--> statement-breakpoint
CREATE INDEX `deliverables_project_id_idx` ON `deliverables` (`projectId`);--> statement-breakpoint
CREATE INDEX `documents_client_id_idx` ON `documents` (`clientId`);--> statement-breakpoint
CREATE INDEX `documents_project_id_idx` ON `documents` (`projectId`);--> statement-breakpoint
CREATE INDEX `invoice_items_invoice_id_idx` ON `invoiceItems` (`invoiceId`);--> statement-breakpoint
CREATE INDEX `invoices_client_id_idx` ON `invoices` (`clientId`);--> statement-breakpoint
CREATE INDEX `invoices_status_idx` ON `invoices` (`status`);--> statement-breakpoint
CREATE INDEX `legal_acceptances_contact_idx` ON `legalAcceptances` (`clientContactId`);--> statement-breakpoint
CREATE INDEX `legal_acceptances_client_idx` ON `legalAcceptances` (`clientId`);--> statement-breakpoint
CREATE INDEX `notifications_recipient_idx` ON `notifications` (`recipientUserId`);--> statement-breakpoint
CREATE INDEX `notifications_client_id_idx` ON `notifications` (`clientId`);--> statement-breakpoint
CREATE INDEX `onboarding_client_id_idx` ON `onboardingSubmissions` (`clientId`);--> statement-breakpoint
CREATE INDEX `projects_client_id_idx` ON `projects` (`clientId`);--> statement-breakpoint
CREATE INDEX `projects_status_idx` ON `projects` (`status`);--> statement-breakpoint
CREATE INDEX `stored_files_client_id_idx` ON `storedFiles` (`clientId`);--> statement-breakpoint
CREATE INDEX `stored_files_document_id_idx` ON `storedFiles` (`documentId`);--> statement-breakpoint
CREATE INDEX `stored_files_invoice_id_idx` ON `storedFiles` (`invoiceId`);