ALTER TABLE `onboardingSubmissions` ADD `serviceTier` enum('starter_store','growth_store','commerce_store');--> statement-breakpoint
ALTER TABLE `onboardingSubmissions` ADD `selectedAddons` text;