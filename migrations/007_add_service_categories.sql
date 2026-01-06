-- =====================================================
-- Migración: Agregar Categorías a Servicios
-- Descripción: Agrega campos category y terminal_id
-- =====================================================

-- Agregar campo category a sys_services
ALTER TABLE sys_services 
ADD COLUMN category ENUM('servicios', 'terminales', 'balanzas', 'otros') 
DEFAULT 'servicios' 
AFTER type;

-- Agregar índice para mejorar consultas por categoría
CREATE INDEX idx_services_category ON sys_services(category);

-- Agregar campo para vincular con terminal (opcional)
ALTER TABLE sys_services 
ADD COLUMN terminal_id INT NULL 
AFTER category;

-- Agregar foreign key constraint
ALTER TABLE sys_services
ADD CONSTRAINT fk_service_terminal 
FOREIGN KEY (terminal_id) REFERENCES pos_terminals(id) 
ON DELETE CASCADE;

-- Comentarios
ALTER TABLE sys_services 
MODIFY COLUMN category ENUM('servicios', 'terminales', 'balanzas', 'otros') 
DEFAULT 'servicios' 
COMMENT 'Categoría del servicio para organización';

ALTER TABLE sys_services 
MODIFY COLUMN terminal_id INT NULL 
COMMENT 'ID de terminal POS asociada (solo para categoría terminales)';
