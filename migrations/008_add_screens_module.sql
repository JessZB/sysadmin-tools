-- Agregar módulo de pantallas
INSERT INTO sys_modules (code, name, description, icon, is_active) 
VALUES ('screens', 'Pantallas', 'Gestión de pantallas TV (Browser y DLNA)', 'fa-tv', 1)
ON DUPLICATE KEY UPDATE 
    name = 'Pantallas',
    description = 'Gestión de pantallas TV (Browser y DLNA)',
    icon = 'fa-tv',
    is_active = 1;
