-- Migration: Add branch_id column to branch_screens table
-- Date: 2026-01-23
-- Description: Adds branch_id column to associate screens with branches

-- Add the branch_id column
ALTER TABLE `branch_screens` 
ADD COLUMN `branch_id` INT(11) DEFAULT NULL AFTER `client_token`,
ADD KEY `fk_branch_screens_branch` (`branch_id`);

-- Add foreign key constraint to sys_branches
ALTER TABLE `branch_screens`
ADD CONSTRAINT `fk_branch_screens_branch` 
FOREIGN KEY (`branch_id`) REFERENCES `sys_branches` (`id`) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- Update existing records to set branch_id = 1 (default branch)
UPDATE `branch_screens` 
SET `branch_id` = 1 
WHERE `branch_id` IS NULL;

-- Optional: Make branch_id NOT NULL if you want to enforce it
-- ALTER TABLE `branch_screens` 
-- MODIFY COLUMN `branch_id` INT(11) NOT NULL DEFAULT 1;
