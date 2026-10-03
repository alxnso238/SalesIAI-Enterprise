-- SalesIA Enterprise schema for Supabase PostgreSQL.
-- Additive and idempotent: existing tables and rows are preserved.
-- Paste the complete file into Supabase SQL Editor for the initial setup.
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

CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(80) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER NOT NULL REFERENCES roles (id),
    permission_id INTEGER NOT NULL REFERENCES permissions (id),
    PRIMARY KEY (role_id, permission_id)
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

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies (id),
    code VARCHAR(40),
    full_name VARCHAR(150) NOT NULL,
    tax_id VARCHAR(30),
    email VARCHAR(150),
    phone VARCHAR(30),
    address TEXT,
    is_active BOOLEAN NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
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

CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies (id),
    user_id INTEGER UNIQUE REFERENCES users (id),
    branch_id INTEGER REFERENCES branches (id),
    employee_code VARCHAR(40),
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150),
    phone VARCHAR(30),
    position VARCHAR(80) NOT NULL,
    is_active BOOLEAN NOT NULL,
    hired_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
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
    customer_id INTEGER,
    employee_id INTEGER,
    sale_date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    status VARCHAR(30) NOT NULL,
    subtotal NUMERIC(14, 2) NOT NULL,
    tax NUMERIC(14, 2) NOT NULL,
    total NUMERIC(14, 2) NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(branch_id) REFERENCES branches (id),
    FOREIGN KEY(user_id) REFERENCES users (id),
    CONSTRAINT fk_sales_customer_id_customers FOREIGN KEY(customer_id) REFERENCES customers (id),
    CONSTRAINT fk_sales_employee_id_employees FOREIGN KEY(employee_id) REFERENCES employees (id)
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

CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER NOT NULL REFERENCES sales (id),
    amount NUMERIC(14, 2) NOT NULL,
    payment_method VARCHAR(40) NOT NULL,
    status VARCHAR(30) NOT NULL,
    transaction_reference VARCHAR(120),
    paid_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
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

CREATE TABLE IF NOT EXISTS datasets (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies (id),
    owner_user_id INTEGER REFERENCES users (id),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    source_type VARCHAR(40) NOT NULL,
    source_config JSON,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS dataset_variables (
    id SERIAL PRIMARY KEY,
    dataset_id INTEGER NOT NULL REFERENCES datasets (id),
    name VARCHAR(100) NOT NULL,
    label VARCHAR(150) NOT NULL,
    variable_type VARCHAR(30) NOT NULL,
    measurement_scale VARCHAR(30),
    source_field VARCHAR(100),
    unit VARCHAR(40),
    is_random BOOLEAN NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    CONSTRAINT uq_dataset_variables_dataset_name UNIQUE(dataset_id, name)
);

CREATE TABLE IF NOT EXISTS observations (
    id SERIAL PRIMARY KEY,
    variable_id INTEGER NOT NULL REFERENCES dataset_variables (id),
    value JSON NOT NULL,
    source_type VARCHAR(40),
    source_id INTEGER,
    observed_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS statistical_analyses (
    id SERIAL PRIMARY KEY,
    dataset_id INTEGER REFERENCES datasets (id),
    variable_id INTEGER REFERENCES dataset_variables (id),
    user_id INTEGER REFERENCES users (id),
    analysis_type VARCHAR(50) NOT NULL,
    parameters JSON,
    filters JSON,
    result JSON NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS statistical_results (
    id SERIAL PRIMARY KEY,
    analysis_id INTEGER NOT NULL REFERENCES statistical_analyses (id),
    metric VARCHAR(80) NOT NULL,
    value JSON NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS bayes_analyses (
    id SERIAL PRIMARY KEY,
    analysis_id INTEGER NOT NULL UNIQUE REFERENCES statistical_analyses (id),
    event_a VARCHAR(120) NOT NULL,
    event_b VARCHAR(120) NOT NULL,
    probability_a NUMERIC(9, 8) NOT NULL,
    probability_b_given_a NUMERIC(9, 8) NOT NULL,
    probability_b_given_not_a NUMERIC(9, 8) NOT NULL,
    probability_b NUMERIC(9, 8) NOT NULL,
    probability_a_given_b NUMERIC(9, 8) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS random_variables (
    id SERIAL PRIMARY KEY,
    variable_id INTEGER NOT NULL UNIQUE REFERENCES dataset_variables (id),
    distribution_type VARCHAR(50) NOT NULL,
    parameters JSON,
    expected_value NUMERIC(18, 6),
    variance NUMERIC(18, 6),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS insights (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies (id),
    analysis_id INTEGER REFERENCES statistical_analyses (id),
    title VARCHAR(180) NOT NULL,
    description TEXT NOT NULL,
    rule_code VARCHAR(80),
    severity VARCHAR(20) NOT NULL,
    evidence JSON,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies (id),
    user_id INTEGER REFERENCES users (id),
    name VARCHAR(150) NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    parameters JSON,
    file_url VARCHAR(500),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_id INTEGER;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS employee_id INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sales_customer_id_customers' AND conrelid = 'sales'::regclass) THEN
        ALTER TABLE sales ADD CONSTRAINT fk_sales_customer_id_customers FOREIGN KEY (customer_id) REFERENCES customers (id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sales_employee_id_employees' AND conrelid = 'sales'::regclass) THEN
        ALTER TABLE sales ADD CONSTRAINT fk_sales_employee_id_employees FOREIGN KEY (employee_id) REFERENCES employees (id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_api_records_collection ON api_records (collection);
CREATE INDEX IF NOT EXISTS ix_api_records_collection_id ON api_records (collection, id);
CREATE INDEX IF NOT EXISTS ix_branches_company_id ON branches (company_id);
CREATE INDEX IF NOT EXISTS ix_categories_company_id ON categories (company_id);
CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email);
CREATE INDEX IF NOT EXISTS ix_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS ix_products_category_id ON products (category_id);
CREATE INDEX IF NOT EXISTS ix_products_company_id ON products (company_id);
CREATE INDEX IF NOT EXISTS ix_products_sku ON products (sku);
CREATE INDEX IF NOT EXISTS ix_sales_branch_id ON sales (branch_id);
CREATE INDEX IF NOT EXISTS ix_sales_customer_id ON sales (customer_id);
CREATE INDEX IF NOT EXISTS ix_sales_employee_id ON sales (employee_id);
CREATE INDEX IF NOT EXISTS ix_sales_sale_date ON sales (sale_date);
CREATE INDEX IF NOT EXISTS ix_sales_user_id ON sales (user_id);
CREATE INDEX IF NOT EXISTS ix_inventory_branch_id ON inventory (branch_id);
CREATE INDEX IF NOT EXISTS ix_inventory_product_id ON inventory (product_id);
CREATE INDEX IF NOT EXISTS ix_sale_details_product_id ON sale_details (product_id);
CREATE INDEX IF NOT EXISTS ix_sale_details_sale_id ON sale_details (sale_id);
CREATE INDEX IF NOT EXISTS ix_targets_branch_id ON targets (branch_id);
CREATE INDEX IF NOT EXISTS ix_targets_product_id ON targets (product_id);
CREATE INDEX IF NOT EXISTS ix_inventory_movements_inventory_id ON inventory_movements (inventory_id);
CREATE INDEX IF NOT EXISTS ix_inventory_movements_product_id ON inventory_movements (product_id);
CREATE INDEX IF NOT EXISTS ix_customers_company_id ON customers (company_id);
CREATE INDEX IF NOT EXISTS ix_datasets_company_id ON datasets (company_id);
CREATE INDEX IF NOT EXISTS ix_datasets_owner_user_id ON datasets (owner_user_id);
CREATE INDEX IF NOT EXISTS ix_employees_branch_id ON employees (branch_id);
CREATE INDEX IF NOT EXISTS ix_employees_company_id ON employees (company_id);
CREATE INDEX IF NOT EXISTS ix_reports_company_id ON reports (company_id);
CREATE INDEX IF NOT EXISTS ix_reports_user_id ON reports (user_id);
CREATE INDEX IF NOT EXISTS ix_dataset_variables_dataset_id ON dataset_variables (dataset_id);
CREATE INDEX IF NOT EXISTS ix_observations_variable_id ON observations (variable_id);
CREATE INDEX IF NOT EXISTS ix_payments_sale_id ON payments (sale_id);
CREATE INDEX IF NOT EXISTS ix_statistical_analyses_dataset_id ON statistical_analyses (dataset_id);
CREATE INDEX IF NOT EXISTS ix_statistical_analyses_user_id ON statistical_analyses (user_id);
CREATE INDEX IF NOT EXISTS ix_statistical_analyses_variable_id ON statistical_analyses (variable_id);
CREATE INDEX IF NOT EXISTS ix_insights_analysis_id ON insights (analysis_id);
CREATE INDEX IF NOT EXISTS ix_insights_company_id ON insights (company_id);
CREATE INDEX IF NOT EXISTS ix_statistical_results_analysis_id ON statistical_results (analysis_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_companies_tax_id ON companies (tax_id);

INSERT INTO roles (name, description)
VALUES
    ('member', 'Usuario registrado'),
    ('admin', 'Administrador'),
    ('analyst', 'Analista estadistico'),
    ('viewer', 'Usuario de solo lectura')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE api_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE dataset_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE statistical_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE statistical_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE bayes_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE random_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS alembic_version (
    version_num VARCHAR(32) PRIMARY KEY NOT NULL
);
ALTER TABLE alembic_version ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    revision_count INTEGER;
    current_revision VARCHAR(32);
BEGIN
    SELECT COUNT(*), MIN(version_num)
      INTO revision_count, current_revision
      FROM alembic_version;

    IF revision_count = 0 THEN
        INSERT INTO alembic_version (version_num) VALUES ('salesia0001');
    ELSIF revision_count = 1 AND current_revision = 'salesia0001' THEN
        NULL;
    ELSE
        RAISE EXCEPTION 'Unexpected Alembic revisions; inspect alembic_version before applying this schema.';
    END IF;
END $$;

COMMIT;
