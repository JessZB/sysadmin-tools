-- 1. Crear tabla de categorías
CREATE TABLE IF NOT EXISTS `sys_module_categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `icon` varchar(50) DEFAULT 'fa-folder',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Insertar Categoría "Sin Asignar" por defecto (ID 1)
INSERT IGNORE INTO `sys_module_categories` (`id`, `name`, `description`) 
VALUES (1, 'Sin Categoría', 'Módulos descubiertos automáticamente que no han sido agrupados.');

-- 3. Alterar sys_modules para vincular categorías y estado de configuración
-- Solo agregamos columnas si NO existen. MariaDB/MySQL moderno (>=10.2) no tiene `IF NOT EXISTS` para ADD COLUMN directo sin un bloque procedimental salvo algunas sintaxis, pero como es la primera vez lo corremos normal.
ALTER TABLE `sys_modules` 
ADD COLUMN IF NOT EXISTS `category_id` int(11) DEFAULT 1,
ADD COLUMN IF NOT EXISTS `is_configured` tinyint(1) DEFAULT 1;

-- 4. Añadir Constraint (Ignorar error si ya existe agregando con try-catch o ejecutando por partes, mysql cl fallará y abortará script por el IF NOT EXISTS en ADD COLUMN). 

-- Reformulando para scripts directos sin IF NOT EXISTS (asumiendo que nunca se ha corrido):
-- Si el ALTER anterior falló por incompatibilidad sintáctica de IF NOT EXISTS, intentar este:
-- ALTER TABLE `sys_modules` ADD COLUMN `category_id` int(11) DEFAULT 1;
-- ALTER TABLE `sys_modules` ADD COLUMN `is_configured` tinyint(1) DEFAULT 1;
-- ALTER TABLE `sys_modules` ADD CONSTRAINT `fk_module_category` FOREIGN KEY (`category_id`) REFERENCES `sys_module_categories`(`id`) ON DELETE SET NULL;
