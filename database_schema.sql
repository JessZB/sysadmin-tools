-- =====================================================
-- Database Schema for SysAdmin Forum
-- =====================================================

CREATE DATABASE IF NOT EXISTS sysadmin_db;
USE sysadmin_db;

-- =====================================================
-- 1. Tables
-- =====================================================

-- Table: sys_branches
CREATE TABLE IF NOT EXISTS sys_branches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    address VARCHAR(255),
    is_active TINYINT(1) DEFAULT 1,
    created_by INT NULL,
    updated_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: sys_users
CREATE TABLE IF NOT EXISTS sys_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'analista', 'viewer') DEFAULT 'viewer',
    branch_id INT NULL,
    created_by INT NULL,
    updated_by INT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES sys_branches(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: sys_modules
CREATE TABLE IF NOT EXISTS sys_modules (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: sys_user_modules
CREATE TABLE IF NOT EXISTS sys_user_modules (
    user_id INT NOT NULL,
    module_code VARCHAR(50) NOT NULL,
    PRIMARY KEY (user_id, module_code),
    FOREIGN KEY (user_id) REFERENCES sys_users(id) ON DELETE CASCADE,
    FOREIGN KEY (module_code) REFERENCES sys_modules(code) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: pos_terminals
CREATE TABLE IF NOT EXISTS pos_terminals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    db_user VARCHAR(100),
    db_pass VARCHAR(255),
    is_active TINYINT(1) DEFAULT 1,
    is_server TINYINT(1) DEFAULT 0,
    branch_id INT NULL,
    created_by INT NULL,
    updated_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES sys_branches(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: sys_services
CREATE TABLE IF NOT EXISTS sys_services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    host VARCHAR(255) NOT NULL,
    type VARCHAR(20) DEFAULT 'ip',
    category ENUM('servicios', 'terminales', 'balanzas', 'otros') DEFAULT 'servicios',
    terminal_id INT NULL,
    description TEXT,
    created_by INT NULL,
    updated_by INT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (terminal_id) REFERENCES pos_terminals(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: sys_service_checks
CREATE TABLE IF NOT EXISTS sys_service_checks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_id INT NOT NULL,
    is_alive TINYINT(1) NOT NULL,
    response_time FLOAT,
    packet_loss FLOAT,
    min_time FLOAT,
    max_time FLOAT,
    avg_time FLOAT,
    error_message VARCHAR(255),
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES sys_services(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: sys_audit_logs
CREATE TABLE IF NOT EXISTS sys_audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    branch_id INT NULL,
    action VARCHAR(50) NOT NULL,
    entity VARCHAR(50) NOT NULL,
    entity_id INT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES sys_users(id) ON DELETE SET NULL,
    FOREIGN KEY (branch_id) REFERENCES sys_branches(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 2. Initial Data
-- =====================================================

-- Branches
INSERT INTO sys_branches (name, code, address, is_active) VALUES 
('Principal', 'BR001', 'Av. Principal 123', 1), 
('Sucursal Norte', 'BR002', 'Calle Norte 456', 1);

-- Modules
INSERT INTO sys_modules (code, name, icon) VALUES 
('dashboard', 'Dashboard', 'bi-speedometer2'),
('users', 'Usuarios', 'bi-people'),
('terminals', 'Terminales', 'bi-pc-display'),
('services', 'Servicios', 'bi-hdd-network'),
('audit', 'Auditoría', 'bi-journal-text'),
('branches', 'Sucursales', 'bi-building'),
('barcode', 'Generador Códigos', 'bi-upc-scan');

-- Users
-- Admin User: admin / 123456
INSERT INTO sys_users (username, password_hash, role, branch_id, is_active) VALUES 
('admin', '$2b$10$laNnOFwMB7siSQZwB//1Beio88sazrtSN3O8/KMdV3xA.SRVVJG6G', 'admin', 1, 1);

-- User Permissions (Admin has all)
INSERT INTO sys_user_modules (user_id, module_code) VALUES 
(1, 'dashboard'), 
(1, 'users'), 
(1, 'terminals'), 
(1, 'services'), 
(1, 'branches'),
(1, 'audit'), 
(1, 'barcode');

-- Sample Terminals
INSERT INTO pos_terminals (name, ip_address, db_user, is_active, is_server, branch_id, created_by) VALUES 
('CAJA 01', '10.20.12.101', 'sa', 1, 0, 1, 1),
('CAJA 02', '10.20.12.102', 'sa', 1, 0, 1, 1),
('CAJA 03', '10.20.12.103', 'sa', 1, 0, 1, 1),
('CAJA 04', '10.20.12.104', 'sa', 1, 0, 1, 1),
('CAJA 05', '10.20.12.105', 'sa', 1, 0, 1, 1),
('CAJA 06', '10.20.12.106', 'sa', 1, 0, 1, 1),
('CAJA 07', '10.20.12.107', 'sa', 1, 0, 1, 1),
('CAJA 08', '10.20.12.108', 'sa', 1, 0, 1, 1),
('CAJA 09', '10.20.12.109', 'sa', 1, 0, 1, 1),
('CAJA 10', '10.20.12.110', 'sa', 1, 0, 1, 1),
('CAJA 11', '10.20.12.111', 'sa', 1, 0, 1, 1),
('CAJA 12', '10.20.12.112', 'sa', 1, 0, 1, 1),
('CAJA 13', '10.20.12.113', 'sa', 1, 0, 1, 1),
('CAJA 14', '10.20.12.114', 'sa', 1, 0, 1, 1),
('CAJA 15', '10.20.12.115', 'sa', 1, 0, 1, 1),
('CAJA 16', '10.20.12.116', 'sa', 1, 0, 1, 1),
('CAJA 17', '10.20.12.117', 'sa', 1, 0, 1, 1),
('CAJA 18', '10.20.12.118', 'sa', 1, 0, 1, 1);



-- Sample Services
INSERT INTO sys_services (name, host, type, category, description, created_by) VALUES 
('Google DNS', '8.8.8.8', 'ip', 'servicios', 'DNS Público de Google', 1),
('Gateway', '192.168.1.1', 'ip', 'servicios', 'Router Principal', 1);


