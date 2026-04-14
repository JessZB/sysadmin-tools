-- =============================================
-- MÓDULO PMC: Price Management Center
-- Todas las tablas son de SOLO ESCRITURA en SysAdmin.
-- NUNCA se toca la base de datos de las terminales registradas.
-- =============================================

-- 1. Catálogo local de productos por sucursal (importado desde MA_PRODUCTOS)
-- No se crea FK a la terminal porque es una copia local independiente.
CREATE TABLE IF NOT EXISTS pmc_products (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    branch_id         INT NOT NULL,
    terminal_id       INT NOT NULL,          -- sys_terminals.id usado en la importación
    product_code      VARCHAR(50) NOT NULL,
    description       VARCHAR(255),
    short_desc        VARCHAR(100),
    department        VARCHAR(50),
    group_code        VARCHAR(50),
    subgroup_code     VARCHAR(50),
    brand             VARCHAR(100),
    unit              VARCHAR(50),           -- c_Presenta (KG, UNIDAD, etc.)
    price1            DECIMAL(18,4) DEFAULT 0,
    tax_pct           DECIMAL(5,2) DEFAULT 0,
    decimals          INT DEFAULT 2,
    is_active         TINYINT(1) DEFAULT 1,
    has_hablador      TINYINT(1) DEFAULT 0,
    image_path        VARCHAR(500) NULL,     -- Ruta de imagen subida por el usuario
    source_updated_at DATETIME NULL,         -- Update_Date del servidor origen
    imported_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_pmc_products UNIQUE (branch_id, product_code)
);

-- 2. Pasillos por sucursal
CREATE TABLE IF NOT EXISTS pmc_aisles (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    branch_id   INT NOT NULL,
    name        VARCHAR(100) NOT NULL,
    number      INT NOT NULL,
    color       VARCHAR(7) DEFAULT '#8d99ae',
    is_active   TINYINT(1) DEFAULT 1,
    sort_order  INT DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. Asignación de productos a pasillos (drag & drop define display_order)
CREATE TABLE IF NOT EXISTS pmc_aisle_products (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    aisle_id        INT NOT NULL,
    product_id      INT NOT NULL,
    display_order   INT NOT NULL DEFAULT 0,
    assigned_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pmc_ap_aisle   FOREIGN KEY (aisle_id)   REFERENCES pmc_aisles(id)   ON DELETE CASCADE,
    CONSTRAINT fk_pmc_ap_product FOREIGN KEY (product_id) REFERENCES pmc_products(id) ON DELETE CASCADE,
    CONSTRAINT uq_pmc_aisle_product UNIQUE (aisle_id, product_id)
);

-- 4. Actualizaciones de precio importadas desde Excel (por sucursal)
CREATE TABLE IF NOT EXISTS pmc_price_updates (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    branch_id         INT NOT NULL,
    product_code      VARCHAR(50) NOT NULL,
    product_name      VARCHAR(255),
    old_price         DECIMAL(18,4),
    new_price         DECIMAL(18,4) NOT NULL,
    price_updated_at  DATETIME NOT NULL,       -- Fecha que viene en el Excel
    tags_printed      TINYINT(1) DEFAULT 0,
    imported_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    imported_by       INT NULL,                -- sys_users.id
    CONSTRAINT uq_pmc_price_update UNIQUE (branch_id, product_code)
);

-- 5. Configuración de mapeo de columnas del Excel (guardado para reutilizar)
CREATE TABLE IF NOT EXISTS pmc_excel_mapping (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    branch_id       INT NOT NULL,
    field_target    VARCHAR(50) NOT NULL,      -- 'product_code' | 'product_name' | 'old_price' | 'new_price' | 'updated_at'
    field_source    VARCHAR(100) NOT NULL,     -- Nombre de columna tal como aparece en el Excel
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_pmc_mapping UNIQUE (branch_id, field_target)
);
