-- Migración: Agregar campos para control Samsung TV
-- Fecha: 2026-01-20
-- Descripción: Añade mac_address para Wake-on-LAN y samsung_token para autenticación

ALTER TABLE branch_screens
ADD COLUMN mac_address VARCHAR(17) NULL COMMENT 'MAC address for Wake-on-LAN (Format: AA:BB:CC:DD:EE:FF)',
ADD COLUMN samsung_token VARCHAR(255) NULL COMMENT 'Samsung TV pairing token for authentication';

-- Índice para búsquedas por MAC address
CREATE INDEX idx_mac_address ON branch_screens(mac_address);
