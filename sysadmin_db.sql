-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 23-01-2026 a las 19:11:39
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `sysadmin_db`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `branch_screens`
--

CREATE TABLE `branch_screens` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `ip_address` varchar(15) DEFAULT NULL,
  `device_type` enum('dlna','browser') DEFAULT 'dlna',
  `socket_id` varchar(100) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `mac_address` varchar(17) DEFAULT NULL COMMENT 'MAC address for Wake-on-LAN (Format: AA:BB:CC:DD:EE:FF)',
  `client_token` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `branch_screens`
--

INSERT INTO `branch_screens` (`id`, `name`, `ip_address`, `device_type`, `socket_id`, `is_active`, `created_at`, `mac_address`, `client_token`) VALUES
(1, '10.20.10.103', '10.20.10.103', 'browser', 'YuSGgF9D1mdbvak5AAAB', 1, '2026-01-20 13:15:53', '1C:86:9A:2E:52:D3', '39345711');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pos_terminals`
--

CREATE TABLE `pos_terminals` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `ip_address` varchar(45) NOT NULL,
  `db_user` varchar(100) DEFAULT NULL,
  `db_pass` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `is_server` tinyint(1) DEFAULT 0,
  `branch_id` int(11) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `pos_terminals`
--

INSERT INTO `pos_terminals` (`id`, `name`, `ip_address`, `db_user`, `db_pass`, `is_active`, `is_server`, `branch_id`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(2, 'Servidor', '10.20.100.8', 'adm.CiudadBolivar', 'b7f45de8941330ec7061532ba1214dc4:7c2de384ffe0d4078b207461e5f3ed7b', 1, 1, 1, 1, 1, '2026-01-15 18:19:23', '2026-01-15 18:35:52'),
(3, 'CAJA 01', '10.20.12.101', 'sa', '', 1, 0, 1, 1, 1, '2026-01-15 18:32:38', '2026-01-15 18:33:44'),
(4, 'CAJA 02', '10.20.12.102', 'sa', '', 1, 0, 1, 1, NULL, '2026-01-15 18:32:38', '2026-01-15 18:34:10'),
(5, 'CAJA 03', '10.20.12.103', 'sa', '', 1, 0, 1, 1, NULL, '2026-01-15 18:32:38', '2026-01-15 18:34:12'),
(6, 'CAJA 04', '10.20.12.104', 'sa', '', 1, 0, 1, 1, NULL, '2026-01-15 18:32:38', '2026-01-15 18:34:15'),
(7, 'CAJA 05', '10.20.12.105', 'sa', '', 1, 0, 1, 1, NULL, '2026-01-15 18:32:38', '2026-01-15 18:34:18'),
(8, 'CAJA 06', '10.20.12.106', 'sa', '', 1, 0, 1, 1, NULL, '2026-01-15 18:32:38', '2026-01-15 18:34:21'),
(9, 'CAJA 07', '10.20.12.107', 'sa', '', 1, 0, 1, 1, NULL, '2026-01-15 18:32:38', '2026-01-15 18:34:24'),
(10, 'CAJA 08', '10.20.12.108', 'sa', '', 1, 0, 1, 1, NULL, '2026-01-15 18:32:38', '2026-01-15 18:34:22'),
(11, 'CAJA 09', '10.20.12.109', 'sa', '', 1, 0, 1, 1, NULL, '2026-01-15 18:32:38', '2026-01-15 18:34:28'),
(12, 'CAJA 10', '10.20.12.110', 'sa', '', 1, 0, 1, 1, NULL, '2026-01-15 18:32:38', '2026-01-15 18:34:26'),
(13, 'CAJA 11', '10.20.12.111', 'sa', '', 1, 0, 1, 1, NULL, '2026-01-15 18:32:38', '2026-01-15 18:34:30'),
(14, 'CAJA 12', '10.20.12.112', 'sa', '', 1, 0, 1, 1, NULL, '2026-01-15 18:32:38', '2026-01-15 18:34:33'),
(15, 'CAJA 13', '10.20.12.113', 'sa', '', 1, 0, 1, 1, NULL, '2026-01-15 18:32:38', '2026-01-15 18:34:32'),
(16, 'CAJA 14', '10.20.12.114', 'sa', '', 1, 0, 1, 1, NULL, '2026-01-15 18:32:38', '2026-01-15 18:34:38'),
(17, 'CAJA 15', '10.20.12.115', 'sa', '', 1, 0, 1, 1, NULL, '2026-01-15 18:32:38', '2026-01-15 18:34:40'),
(18, 'CAJA 16', '10.20.12.116', 'sa', '', 1, 0, 1, 1, NULL, '2026-01-15 18:32:38', '2026-01-15 18:34:43'),
(19, 'CAJA 17', '10.20.12.117', 'sa', '', 1, 0, 1, 1, NULL, '2026-01-15 18:32:38', '2026-01-15 18:34:45'),
(20, 'CAJA 18', '10.20.12.118', 'sa', '', 1, 0, 1, 1, NULL, '2026-01-15 18:32:38', '2026-01-15 18:34:47');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `sys_audit_logs`
--

CREATE TABLE `sys_audit_logs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `branch_id` int(11) DEFAULT NULL,
  `action` varchar(50) NOT NULL,
  `entity` varchar(50) NOT NULL,
  `entity_id` int(11) DEFAULT NULL,
  `details` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `sys_audit_logs`
--

INSERT INTO `sys_audit_logs` (`id`, `user_id`, `branch_id`, `action`, `entity`, `entity_id`, `details`, `ip_address`, `created_at`) VALUES
(1, 1, 1, 'UPDATE', 'BRANCH', 1, 'Sucursal actualizada: Principal', '::1', '2026-01-15 18:30:38'),
(2, 1, 1, 'DELETE', 'BRANCH', 2, 'Sucursal eliminada ID: 2', '::1', '2026-01-15 18:30:40'),
(3, 1, 1, 'UPDATE', 'TERMINAL', 2, 'Terminal actualizada: Servidor Central', '::1', '2026-01-15 18:33:07'),
(4, 1, 1, 'UPDATE', 'TERMINAL', 3, 'Terminal actualizada: CAJA 01', '::1', '2026-01-15 18:33:44'),
(5, 1, 1, 'UPDATE', 'BRANCH', 1, 'Sucursal actualizada: Ciudad Bolívar', '::1', '2026-01-15 18:35:40'),
(6, 1, 1, 'UPDATE', 'TERMINAL', 2, 'Terminal actualizada: Servidor', '::1', '2026-01-15 18:35:52'),
(7, 1, 1, 'EXECUTE', 'JOB', 14, 'Job ejecutado: Job_Prueba_1Minuto en terminal ID 14', '::1', '2026-01-15 18:36:14'),
(8, 1, 1, 'LOGIN', 'USER', 1, 'Inicio de sesión exitoso', '::1', '2026-01-19 12:39:24'),
(9, 1, 1, 'LOGIN', 'USER', 1, 'Inicio de sesión exitoso', '::1', '2026-01-19 20:07:49'),
(10, 1, 1, 'LOGIN', 'USER', 1, 'Inicio de sesión exitoso', '::1', '2026-01-20 11:29:35'),
(11, 1, 1, 'LOGIN', 'USER', 1, 'Inicio de sesión exitoso', '::1', '2026-01-20 13:15:07'),
(12, 1, 1, 'LOGIN', 'USER', 1, 'Inicio de sesión exitoso', '::1', '2026-01-21 16:56:44'),
(13, 1, 1, 'LOGIN', 'USER', 1, 'Inicio de sesión exitoso', '::1', '2026-01-22 01:47:10'),
(14, 1, 1, 'LOGIN', 'USER', 1, 'Inicio de sesión exitoso', '::1', '2026-01-23 01:29:00');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `sys_branches`
--

CREATE TABLE `sys_branches` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `code` varchar(50) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `sys_branches`
--

INSERT INTO `sys_branches` (`id`, `name`, `code`, `address`, `is_active`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(1, 'Ciudad Bolívar', 'SUC-20', 'Av. Principal 123', 1, NULL, 1, '2026-01-15 18:19:23', '2026-01-15 18:35:40');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `sys_modules`
--

CREATE TABLE `sys_modules` (
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `icon` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `sys_modules`
--

INSERT INTO `sys_modules` (`code`, `name`, `icon`) VALUES
('audit', 'Auditoría', 'bi-journal-text'),
('barcode', 'Generador Códigos', 'bi-upc-scan'),
('branches', 'Sucursales', 'bi-building'),
('dashboard', 'Dashboard', 'bi-speedometer2'),
('screens', 'Pantallas', 'fa-tv'),
('services', 'Servicios', 'bi-hdd-network'),
('terminals', 'Terminales', 'bi-pc-display'),
('users', 'Usuarios', 'bi-people');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `sys_services`
--

CREATE TABLE `sys_services` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `host` varchar(255) NOT NULL,
  `type` varchar(20) DEFAULT 'ip',
  `category` enum('servicios','terminales','balanzas','otros') DEFAULT 'servicios',
  `terminal_id` int(11) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `sys_services`
--

INSERT INTO `sys_services` (`id`, `name`, `host`, `type`, `category`, `terminal_id`, `description`, `created_by`, `updated_by`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'Google DNS', '8.8.8.8', 'ip', 'servicios', NULL, 'DNS Público de Google', 1, NULL, 1, '2026-01-15 18:19:24', NULL),
(2, 'Gateway', '192.168.1.1', 'ip', 'servicios', NULL, 'Router Principal', 1, NULL, 1, '2026-01-15 18:19:24', NULL),
(3, 'Balanza Charcutería Barra 1', '10.20.40.28', 'ip', 'balanzas', NULL, '', 1, 1, 1, '2026-01-19 13:01:57', '2026-01-20 12:05:37'),
(4, 'Balanza Charcutería Barra 2', '10.20.40.29', 'ip', 'balanzas', NULL, '', 1, 1, 1, '2026-01-19 14:05:26', '2026-01-20 12:06:12'),
(5, 'Balanza Charcutería Barra 3', '10.20.40.30', 'ip', 'balanzas', NULL, '', 1, 1, 1, '2026-01-19 14:05:47', '2026-01-20 12:05:59'),
(6, 'Balanza Carnicería Barra 1', '10.20.40.31', 'ip', 'balanzas', NULL, '', 1, NULL, 1, '2026-01-19 15:04:26', NULL),
(7, 'Balanza Carnicería Barra 2', '10.20.40.32', 'ip', 'balanzas', NULL, '', 1, NULL, 1, '2026-01-19 15:04:45', NULL),
(8, 'Balanza Carnicería Barra 3', '10.20.40.33', 'ip', 'balanzas', NULL, '', 1, 1, 1, '2026-01-19 15:05:02', '2026-01-20 12:05:27'),
(9, 'Servidor', '10.20.100.8', 'ip', 'terminales', 2, 'Terminal POS - Servidor', 1, NULL, 1, '2026-01-19 15:06:16', NULL),
(10, 'CAJA 01', '10.20.12.101', 'ip', 'terminales', 3, 'Terminal POS - CAJA 01', 1, NULL, 1, '2026-01-19 15:06:16', NULL),
(11, 'CAJA 02', '10.20.12.102', 'ip', 'terminales', 4, 'Terminal POS - CAJA 02', 1, NULL, 1, '2026-01-19 15:06:16', NULL),
(12, 'CAJA 03', '10.20.12.103', 'ip', 'terminales', 5, 'Terminal POS - CAJA 03', 1, NULL, 1, '2026-01-19 15:06:16', NULL),
(13, 'CAJA 04', '10.20.12.104', 'ip', 'terminales', 6, 'Terminal POS - CAJA 04', 1, NULL, 1, '2026-01-19 15:06:16', NULL),
(14, 'CAJA 05', '10.20.12.105', 'ip', 'terminales', 7, 'Terminal POS - CAJA 05', 1, NULL, 1, '2026-01-19 15:06:16', NULL),
(15, 'CAJA 06', '10.20.12.106', 'ip', 'terminales', 8, 'Terminal POS - CAJA 06', 1, NULL, 1, '2026-01-19 15:06:16', NULL),
(16, 'CAJA 07', '10.20.12.107', 'ip', 'terminales', 9, 'Terminal POS - CAJA 07', 1, NULL, 1, '2026-01-19 15:06:16', NULL),
(17, 'CAJA 08', '10.20.12.108', 'ip', 'terminales', 10, 'Terminal POS - CAJA 08', 1, NULL, 1, '2026-01-19 15:06:16', NULL),
(18, 'CAJA 09', '10.20.12.109', 'ip', 'terminales', 11, 'Terminal POS - CAJA 09', 1, NULL, 1, '2026-01-19 15:06:16', NULL),
(19, 'CAJA 10', '10.20.12.110', 'ip', 'terminales', 12, 'Terminal POS - CAJA 10', 1, NULL, 1, '2026-01-19 15:06:16', NULL),
(20, 'CAJA 11', '10.20.12.111', 'ip', 'terminales', 13, 'Terminal POS - CAJA 11', 1, NULL, 1, '2026-01-19 15:06:16', NULL),
(21, 'CAJA 12', '10.20.12.112', 'ip', 'terminales', 14, 'Terminal POS - CAJA 12', 1, NULL, 1, '2026-01-19 15:06:16', NULL),
(22, 'CAJA 13', '10.20.12.113', 'ip', 'terminales', 15, 'Terminal POS - CAJA 13', 1, NULL, 1, '2026-01-19 15:06:16', NULL),
(23, 'CAJA 14', '10.20.12.114', 'ip', 'terminales', 16, 'Terminal POS - CAJA 14', 1, NULL, 1, '2026-01-19 15:06:16', NULL),
(24, 'CAJA 15', '10.20.12.115', 'ip', 'terminales', 17, 'Terminal POS - CAJA 15', 1, NULL, 1, '2026-01-19 15:06:16', NULL),
(25, 'CAJA 16', '10.20.12.116', 'ip', 'terminales', 18, 'Terminal POS - CAJA 16', 1, NULL, 1, '2026-01-19 15:06:16', NULL),
(26, 'CAJA 17', '10.20.12.117', 'ip', 'terminales', 19, 'Terminal POS - CAJA 17', 1, NULL, 1, '2026-01-19 15:06:16', NULL),
(27, 'CAJA 18', '10.20.12.118', 'ip', 'terminales', 20, 'Terminal POS - CAJA 18', 1, NULL, 1, '2026-01-19 15:06:16', NULL),
(28, 'Balanza Carnicería 1', '10.20.40.23', 'ip', 'balanzas', NULL, '', 1, 1, 1, '2026-01-20 12:07:16', '2026-01-20 12:07:52'),
(29, 'Balanza Carnicería 2', '10.20.40.24', 'ip', 'balanzas', NULL, '', 1, NULL, 1, '2026-01-20 12:08:17', NULL),
(30, 'Balanza Charcutería 1', '10.20.40.20', 'ip', 'balanzas', NULL, '', 1, NULL, 1, '2026-01-20 12:09:33', NULL),
(31, 'Balanza Charcutería 2', '10.20.40.21', 'ip', 'balanzas', NULL, '', 1, NULL, 1, '2026-01-20 12:09:45', NULL),
(32, 'Balanza Charcutería 3', '10.20.40.22', 'ip', 'balanzas', NULL, '', 1, NULL, 1, '2026-01-20 12:10:15', NULL),
(33, 'Balanza Fruver 1', '10.20.40.25', 'ip', 'balanzas', NULL, '', 1, NULL, 1, '2026-01-20 12:11:27', NULL),
(34, 'Balanza Fruver', '10.20.40.26', 'ip', 'balanzas', NULL, '', 1, NULL, 1, '2026-01-20 12:11:42', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `sys_service_checks`
--

CREATE TABLE `sys_service_checks` (
  `id` int(11) NOT NULL,
  `service_id` int(11) NOT NULL,
  `is_alive` tinyint(1) NOT NULL,
  `response_time` float DEFAULT NULL,
  `packet_loss` float DEFAULT NULL,
  `min_time` float DEFAULT NULL,
  `max_time` float DEFAULT NULL,
  `avg_time` float DEFAULT NULL,
  `error_message` varchar(255) DEFAULT NULL,
  `checked_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `sys_service_checks`
--

INSERT INTO `sys_service_checks` (`id`, `service_id`, `is_alive`, `response_time`, `packet_loss`, `min_time`, `max_time`, `avg_time`, `error_message`, `checked_at`) VALUES
(1, 1, 1, 57, 0, 52, 67, 57, NULL, '2026-01-19 12:44:58'),
(2, 1, 1, 52, 0, 52, 53, 52, NULL, '2026-01-19 12:45:04'),
(3, 2, 0, NULL, 100, NULL, NULL, NULL, 'Host unreachable', '2026-01-19 12:45:24'),
(4, 3, 1, 0, 0, 0, 0, 0, NULL, '2026-01-19 13:02:03'),
(5, 3, 1, 0, 0, 0, 0, 0, NULL, '2026-01-19 13:02:13'),
(6, 3, 1, 0, 0, 0, 0, 0, NULL, '2026-01-19 13:02:26'),
(7, 2, 0, NULL, 100, NULL, NULL, NULL, 'Host unreachable', '2026-01-19 13:02:49'),
(8, 1, 1, 52, 0, 52, 53, 52, NULL, '2026-01-19 13:02:52'),
(9, 3, 1, 0, 0, 0, 0, 0, NULL, '2026-01-19 13:19:37'),
(10, 2, 0, NULL, 100, NULL, NULL, NULL, 'Host unreachable', '2026-01-19 13:20:07'),
(11, 2, 0, NULL, 100, NULL, NULL, NULL, 'Host unreachable', '2026-01-19 13:20:56'),
(12, 3, 1, 0, 0, 0, 0, 0, NULL, '2026-01-19 13:21:37'),
(13, 2, 0, NULL, 100, NULL, NULL, NULL, 'Host unreachable', '2026-01-19 13:22:02'),
(14, 3, 1, 0, 0, 0, 0, 0, NULL, '2026-01-19 13:39:03'),
(15, 3, 1, 0, 0, 0, 0, 0, NULL, '2026-01-19 13:39:26'),
(16, 2, 0, NULL, 100, NULL, NULL, NULL, 'Host unreachable', '2026-01-19 13:39:26'),
(17, 3, 1, 0, 0, 0, 0, 0, NULL, '2026-01-19 13:39:30'),
(18, 3, 1, 0, 0, 0, 0, 0, NULL, '2026-01-19 13:39:47'),
(19, 3, 1, 0, 0, 0, 0, 0, NULL, '2026-01-19 13:40:07'),
(20, 1, 1, 55, 0, 52, 66, 55, NULL, '2026-01-19 13:40:07'),
(21, 2, 0, NULL, 100, NULL, NULL, NULL, 'Host unreachable', '2026-01-19 13:40:27'),
(22, 2, 0, NULL, 100, NULL, NULL, NULL, 'Host unreachable', '2026-01-19 14:00:21'),
(23, 3, 1, 0, 0, 0, 0, 0, NULL, '2026-01-19 14:00:24'),
(24, 3, 1, 0, 0, 0, 0, 0, NULL, '2026-01-19 14:05:03'),
(25, 3, 1, 0, 0, 0, 0, 0, NULL, '2026-01-19 15:01:06'),
(26, 3, 1, 0, 0, 0, 0, 0, NULL, '2026-01-19 15:03:36'),
(27, 3, 1, 0, 0, 0, 0, 0, NULL, '2026-01-19 15:03:39'),
(28, 3, 1, 0, 0, 0, 0, 0, NULL, '2026-01-19 15:03:42'),
(29, 3, 1, 0, 0, 0, 0, 0, NULL, '2026-01-19 15:03:51'),
(30, 4, 1, 0, 0, 0, 0, 0, NULL, '2026-01-19 15:03:54'),
(31, 5, 1, 0, 0, 0, 0, 0, NULL, '2026-01-19 15:03:57'),
(32, 6, 1, 1, 0, 0, 5, 1, NULL, '2026-01-19 15:04:32'),
(33, 6, 1, 0, 0, 0, 0, 0, NULL, '2026-01-19 15:05:42'),
(34, 7, 1, 0, 0, 0, 0, 0, NULL, '2026-01-19 15:05:45'),
(35, 8, 1, 0, 0, 0, 0, 0, NULL, '2026-01-19 15:05:49'),
(36, 3, 1, 0, 0, 0, 0, 0, NULL, '2026-01-19 15:05:52'),
(37, 4, 1, 0, 0, 0, 0, 0, NULL, '2026-01-19 15:05:55'),
(38, 5, 1, 0, 0, 0, 0, 0, NULL, '2026-01-19 15:05:58'),
(39, 10, 1, 0, 0, 0, 0, 0, NULL, '2026-01-19 15:06:22'),
(40, 6, 1, 0, 0, 0, 3, 0, NULL, '2026-01-20 11:29:45'),
(41, 7, 1, 0, 0, 0, 0, 0, NULL, '2026-01-20 11:29:48'),
(42, 8, 1, 0, 0, 0, 0, 0, NULL, '2026-01-20 11:29:51'),
(43, 3, 1, 0, 0, 0, 0, 0, NULL, '2026-01-20 11:29:54'),
(44, 4, 1, 0, 0, 0, 0, 0, NULL, '2026-01-20 11:29:57'),
(45, 5, 1, 0, 0, 0, 0, 0, NULL, '2026-01-20 11:30:01'),
(46, 6, 1, 5, 0, 0, 11, 5, NULL, '2026-01-20 12:07:20'),
(47, 7, 1, 1, 0, 0, 5, 1, NULL, '2026-01-20 12:07:23'),
(48, 28, 1, 4, 0, 2, 9, 4, NULL, '2026-01-20 12:09:50'),
(49, 34, 1, 4, 0, 2, 8, 4, NULL, '2026-01-20 12:12:05'),
(50, 33, 1, 5, 0, 3, 7, 5, NULL, '2026-01-20 12:12:09'),
(51, 31, 1, 111, 0, 5, 429, 111, NULL, '2026-01-20 12:12:13'),
(52, 32, 0, NULL, 100, NULL, NULL, NULL, 'Host unreachable', '2026-01-20 12:12:33'),
(53, 32, 1, 3, 0, 3, 4, 3, NULL, '2026-01-20 12:13:05'),
(54, 32, 1, 11, 0, 2, 31, 11, NULL, '2026-01-20 12:13:14'),
(55, 31, 1, 4, 0, 4, 6, 4, NULL, '2026-01-20 12:13:16'),
(56, 29, 1, 6, 0, 5, 8, 6, NULL, '2026-01-20 12:13:30'),
(57, 30, 1, 3, 0, 3, 3, 3, NULL, '2026-01-20 12:13:56');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `sys_users`
--

CREATE TABLE `sys_users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','analista','viewer') DEFAULT 'viewer',
  `branch_id` int(11) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `sys_users`
--

INSERT INTO `sys_users` (`id`, `username`, `password_hash`, `role`, `branch_id`, `created_by`, `updated_by`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'admin', '$2b$10$laNnOFwMB7siSQZwB//1Beio88sazrtSN3O8/KMdV3xA.SRVVJG6G', 'admin', 1, NULL, NULL, 1, '2026-01-15 18:19:23', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `sys_user_modules`
--

CREATE TABLE `sys_user_modules` (
  `user_id` int(11) NOT NULL,
  `module_code` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `sys_user_modules`
--

INSERT INTO `sys_user_modules` (`user_id`, `module_code`) VALUES
(1, 'audit'),
(1, 'barcode'),
(1, 'branches'),
(1, 'dashboard'),
(1, 'services'),
(1, 'terminals'),
(1, 'users');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `branch_screens`
--
ALTER TABLE `branch_screens`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_mac_address` (`mac_address`);

--
-- Indices de la tabla `pos_terminals`
--
ALTER TABLE `pos_terminals`
  ADD PRIMARY KEY (`id`),
  ADD KEY `branch_id` (`branch_id`);

--
-- Indices de la tabla `sys_audit_logs`
--
ALTER TABLE `sys_audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `branch_id` (`branch_id`);

--
-- Indices de la tabla `sys_branches`
--
ALTER TABLE `sys_branches`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `sys_modules`
--
ALTER TABLE `sys_modules`
  ADD PRIMARY KEY (`code`);

--
-- Indices de la tabla `sys_services`
--
ALTER TABLE `sys_services`
  ADD PRIMARY KEY (`id`),
  ADD KEY `terminal_id` (`terminal_id`);

--
-- Indices de la tabla `sys_service_checks`
--
ALTER TABLE `sys_service_checks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `service_id` (`service_id`);

--
-- Indices de la tabla `sys_users`
--
ALTER TABLE `sys_users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD KEY `branch_id` (`branch_id`);

--
-- Indices de la tabla `sys_user_modules`
--
ALTER TABLE `sys_user_modules`
  ADD PRIMARY KEY (`user_id`,`module_code`),
  ADD KEY `module_code` (`module_code`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `branch_screens`
--
ALTER TABLE `branch_screens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `pos_terminals`
--
ALTER TABLE `pos_terminals`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT de la tabla `sys_audit_logs`
--
ALTER TABLE `sys_audit_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT de la tabla `sys_branches`
--
ALTER TABLE `sys_branches`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `sys_services`
--
ALTER TABLE `sys_services`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=35;

--
-- AUTO_INCREMENT de la tabla `sys_service_checks`
--
ALTER TABLE `sys_service_checks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=58;

--
-- AUTO_INCREMENT de la tabla `sys_users`
--
ALTER TABLE `sys_users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `pos_terminals`
--
ALTER TABLE `pos_terminals`
  ADD CONSTRAINT `pos_terminals_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `sys_branches` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `sys_audit_logs`
--
ALTER TABLE `sys_audit_logs`
  ADD CONSTRAINT `sys_audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `sys_users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `sys_audit_logs_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `sys_branches` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `sys_services`
--
ALTER TABLE `sys_services`
  ADD CONSTRAINT `sys_services_ibfk_1` FOREIGN KEY (`terminal_id`) REFERENCES `pos_terminals` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `sys_service_checks`
--
ALTER TABLE `sys_service_checks`
  ADD CONSTRAINT `sys_service_checks_ibfk_1` FOREIGN KEY (`service_id`) REFERENCES `sys_services` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `sys_users`
--
ALTER TABLE `sys_users`
  ADD CONSTRAINT `sys_users_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `sys_branches` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `sys_user_modules`
--
ALTER TABLE `sys_user_modules`
  ADD CONSTRAINT `sys_user_modules_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `sys_users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `sys_user_modules_ibfk_2` FOREIGN KEY (`module_code`) REFERENCES `sys_modules` (`code`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
