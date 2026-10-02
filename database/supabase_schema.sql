-- MatrixFlow schema for Supabase PostgreSQL.
-- Additive and idempotent: existing tables and rows are preserved.
-- Run this in Supabase SQL Editor after taking a database backup.
BEGIN;
SET LOCAL search_path = public;

CREATE TABLE IF NOT EXISTS api_records (
    id SERIAL NOT NULL,
    collection VARCHAR(40) NOT NULL,
    payload JSON NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS companies (
    id SERIAL NOT NULL,
    name VARCHAR(150) NOT NULL,
    tax_id VARCHAR(30),
    email VARCHAR(150),
    phone VARCHAR(30),
    address TEXT,
    is_active BOOLEAN NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (tax_id)
);

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL NOT NULL,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    PRIMARY KEY (id),
    UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS branches (
    id SERIAL NOT NULL,
    company_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(30) NOT NULL,
    city VARCHAR(100) NOT NULL,
    address TEXT,
    phone VARCHAR(30),
    is_active BOOLEAN NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(company_id) REFERENCES companies (id)
);

CREATE TABLE IF NOT EXISTS categories (
    id SERIAL NOT NULL,
    company_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(company_id) REFERENCES companies (id)
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL NOT NULL,
    role_id INTEGER NOT NULL,
    company_id INTEGER,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(role_id) REFERENCES roles (id),
    FOREIGN KEY(company_id) REFERENCES companies (id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL NOT NULL,
    user_id INTEGER,
    action VARCHAR(100) NOT NULL,
    module VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id INTEGER,
    status VARCHAR(30) NOT NULL,
    ip_address VARCHAR(45),
    details JSON,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(user_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS matrices (
    id SERIAL NOT NULL,
    company_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    rows INTEGER NOT NULL,
    columns INTEGER NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(company_id) REFERENCES companies (id),
    FOREIGN KEY(user_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS operations (
    id SERIAL NOT NULL,
    user_id INTEGER NOT NULL,
    operation_type VARCHAR(80) NOT NULL,
    status VARCHAR(30) NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITHOUT TIME ZONE,
    PRIMARY KEY (id),
    FOREIGN KEY(user_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL NOT NULL,
    company_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    sku VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    cost_price NUMERIC(12, 2) NOT NULL,
    sale_price NUMERIC(12, 2) NOT NULL,
    minimum_stock NUMERIC(12, 2) NOT NULL,
    is_active BOOLEAN NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(company_id) REFERENCES companies (id),
    FOREIGN KEY(category_id) REFERENCES categories (id)
);

CREATE TABLE IF NOT EXISTS sales (
    id SERIAL NOT NULL,
    branch_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    sale_date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    status VARCHAR(30) NOT NULL,
    subtotal NUMERIC(14, 2) NOT NULL,
    tax NUMERIC(14, 2) NOT NULL,
    total NUMERIC(14, 2) NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(branch_id) REFERENCES branches (id),
    FOREIGN KEY(user_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS vectors (
    id SERIAL NOT NULL,
    company_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    dimension INTEGER NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(company_id) REFERENCES companies (id),
    FOREIGN KEY(user_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL NOT NULL,
    branch_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity NUMERIC(14, 2) NOT NULL,
    minimum_quantity NUMERIC(14, 2) NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(branch_id) REFERENCES branches (id),
    FOREIGN KEY(product_id) REFERENCES products (id)
);

CREATE TABLE IF NOT EXISTS matrix_values (
    id SERIAL NOT NULL,
    matrix_id INTEGER NOT NULL,
    row_index INTEGER NOT NULL,
    column_index INTEGER NOT NULL,
    value NUMERIC(18, 6) NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(matrix_id) REFERENCES matrices (id)
);

CREATE TABLE IF NOT EXISTS operation_inputs (
    id SERIAL NOT NULL,
    operation_id INTEGER NOT NULL,
    input_order INTEGER NOT NULL,
    input_type VARCHAR(30) NOT NULL,
    vector_id INTEGER,
    matrix_id INTEGER,
    input_data JSON,
    PRIMARY KEY (id),
    FOREIGN KEY(operation_id) REFERENCES operations (id),
    FOREIGN KEY(vector_id) REFERENCES vectors (id),
    FOREIGN KEY(matrix_id) REFERENCES matrices (id)
);

CREATE TABLE IF NOT EXISTS operation_results (
    id SERIAL NOT NULL,
    operation_id INTEGER NOT NULL,
    result_type VARCHAR(30) NOT NULL,
    vector_id INTEGER,
    matrix_id INTEGER,
    result_data JSON,
    PRIMARY KEY (id),
    FOREIGN KEY(operation_id) REFERENCES operations (id),
    FOREIGN KEY(vector_id) REFERENCES vectors (id),
    FOREIGN KEY(matrix_id) REFERENCES matrices (id)
);

CREATE TABLE IF NOT EXISTS sale_details (
    id SERIAL NOT NULL,
    sale_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    subtotal NUMERIC(14, 2) NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(sale_id) REFERENCES sales (id),
    FOREIGN KEY(product_id) REFERENCES products (id)
);

CREATE TABLE IF NOT EXISTS targets (
    id SERIAL NOT NULL,
    branch_id INTEGER,
    product_id INTEGER,
    name VARCHAR(150) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    target_quantity NUMERIC(14, 2),
    target_amount NUMERIC(14, 2),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(branch_id) REFERENCES branches (id),
    FOREIGN KEY(product_id) REFERENCES products (id)
);

CREATE TABLE IF NOT EXISTS vector_values (
    id SERIAL NOT NULL,
    vector_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    label VARCHAR(150),
    value NUMERIC(18, 6) NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(vector_id) REFERENCES vectors (id)
);

CREATE TABLE IF NOT EXISTS inventory_movements (
    id SERIAL NOT NULL,
    inventory_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    movement_type VARCHAR(30) NOT NULL,
    quantity NUMERIC(14, 2) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(inventory_id) REFERENCES inventory (id),
    FOREIGN KEY(product_id) REFERENCES products (id),
    FOREIGN KEY(user_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS ix_api_records_collection ON api_records (collection);
CREATE INDEX IF NOT EXISTS ix_api_records_collection_id ON api_records (collection, id);
CREATE INDEX IF NOT EXISTS ix_branches_company_id ON branches (company_id);
CREATE INDEX IF NOT EXISTS ix_categories_company_id ON categories (company_id);
CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email);
CREATE INDEX IF NOT EXISTS ix_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS ix_matrices_company_id ON matrices (company_id);
CREATE INDEX IF NOT EXISTS ix_operations_user_id ON operations (user_id);
CREATE INDEX IF NOT EXISTS ix_products_category_id ON products (category_id);
CREATE INDEX IF NOT EXISTS ix_products_company_id ON products (company_id);
CREATE INDEX IF NOT EXISTS ix_products_sku ON products (sku);
CREATE INDEX IF NOT EXISTS ix_sales_branch_id ON sales (branch_id);
CREATE INDEX IF NOT EXISTS ix_sales_sale_date ON sales (sale_date);
CREATE INDEX IF NOT EXISTS ix_sales_user_id ON sales (user_id);
CREATE INDEX IF NOT EXISTS ix_vectors_company_id ON vectors (company_id);
CREATE INDEX IF NOT EXISTS ix_inventory_branch_id ON inventory (branch_id);
CREATE INDEX IF NOT EXISTS ix_inventory_product_id ON inventory (product_id);
CREATE INDEX IF NOT EXISTS ix_matrix_values_matrix_id ON matrix_values (matrix_id);
CREATE INDEX IF NOT EXISTS ix_operation_inputs_operation_id ON operation_inputs (operation_id);
CREATE INDEX IF NOT EXISTS ix_operation_results_operation_id ON operation_results (operation_id);
CREATE INDEX IF NOT EXISTS ix_sale_details_product_id ON sale_details (product_id);
CREATE INDEX IF NOT EXISTS ix_sale_details_sale_id ON sale_details (sale_id);
CREATE INDEX IF NOT EXISTS ix_targets_branch_id ON targets (branch_id);
CREATE INDEX IF NOT EXISTS ix_targets_product_id ON targets (product_id);
CREATE INDEX IF NOT EXISTS ix_vector_values_vector_id ON vector_values (vector_id);
CREATE INDEX IF NOT EXISTS ix_inventory_movements_inventory_id ON inventory_movements (inventory_id);
CREATE INDEX IF NOT EXISTS ix_inventory_movements_product_id ON inventory_movements (product_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_companies_tax_id ON companies (tax_id);

INSERT INTO roles (name, description)
VALUES ('member', 'Usuario registrado'), ('admin', 'Administrador')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE api_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE matrices ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE matrix_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE vector_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS alembic_version (
    version_num VARCHAR(32) PRIMARY KEY NOT NULL
);

DO $$
DECLARE
    revision_count INTEGER;
    current_revision VARCHAR(32);
BEGIN
    SELECT COUNT(*), MIN(version_num)
      INTO revision_count, current_revision
      FROM alembic_version;

    IF revision_count = 0 THEN
        INSERT INTO alembic_version (version_num) VALUES ('7a31d48e2c10');
    ELSIF revision_count = 1 AND current_revision IN ('c55808195aa4', '7a31d48e2c10') THEN
        UPDATE alembic_version SET version_num = '7a31d48e2c10';
    ELSE
        RAISE EXCEPTION 'Unexpected Alembic revisions; inspect alembic_version before applying this schema.';
    END IF;
END $$;

COMMIT;
