-- Migration: Rename samsung_token to client_token for multi-brand support
-- Date: 2026-01-23
-- Description: Generalizes the token field to support multiple TV brands (Samsung, LG, etc.)

ALTER TABLE branch_screens 
CHANGE samsung_token client_token VARCHAR(255);
