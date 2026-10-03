# Base de datos

El esquema PostgreSQL y sus migraciones están centralizados en `backend/alembic/`. FastAPI se conecta a Supabase mediante `DATABASE_URL`; el frontend no accede directamente a la base de datos.

El esquema incluye clientes, empleados/vendedores, pagos, permisos por rol, datasets, variables, observaciones, análisis, resultados de Bayes, variables aleatorias, insights y reportes. `sales.customer_id` y `sales.employee_id` son opcionales.

Los endpoints actuales guardan clientes, empleados, catálogos, ventas, pagos, datasets y resultados analíticos en `api_records`. Usuarios, roles y auditoría usan tablas relacionales. El SQL incluye las tablas relacionales previstas para el crecimiento del sistema.

## Supabase

Para crear la base SalesIA, pega el archivo completo `supabase_schema.sql` en Supabase SQL Editor. Crea las tablas del sistema, activa RLS, agrega los cuatro roles y registra la revisión Alembic `salesia0001`.

**Usa el script SQL o Alembic, no ambos para inicializar la misma base.** El script y la migración `salesia0001` crean el mismo esquema. Si ejecutas el SQL, no vuelvas a aplicar la migración inicial.

El backend se conecta con `DATABASE_URL` usando la cadena PostgreSQL del Session pooler (puerto 5432) y TLS (`sslmode=require`). La autorización de la aplicación se aplica mediante JWT y roles. No configures una clave `SUPABASE_KEY` en el frontend ni accedas desde el navegador directamente a las tablas.

Después de crear el esquema, crea la primera cuenta administradora desde el backend con `python -m app.utils.create_user`. Comprueba `GET /ready` y prueba el acceso autenticado a `GET /api/v1/resources/companies`.