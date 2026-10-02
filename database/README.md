# Base de datos

El esquema PostgreSQL y sus migraciones están centralizados en `backend/alembic/`. FastAPI se conecta a Supabase mediante `DATABASE_URL`; el frontend no accede directamente a la base de datos. Las rutas GET/POST/PUT/DELETE están implementadas en FastAPI; el SQL solo crea el almacenamiento que esas rutas usan.

## Supabase

Para reparar o inicializar el esquema desde Supabase SQL Editor, ejecuta `supabase_schema.sql` después de crear una copia de seguridad. El script es aditivo e idempotente: crea las tablas e índices faltantes, activa RLS, crea los roles `member` y `admin` y registra la revisión Alembic actual. No elimina filas ni altera tipos de columnas ya existentes.

El backend se conecta con `DATABASE_URL` usando el usuario PostgreSQL `postgres`, que omite RLS. No configures una clave `SUPABASE_KEY` en el frontend ni uses el cliente Supabase desde el navegador para los registros de negocio. El token JWT del usuario se usa para autorizar las llamadas al API.

Después de ejecutar el SQL, comprueba `GET /ready` y luego prueba el acceso autenticado a `GET /api/v1/resources/companies` y una creación `POST /api/v1/resources/companies`. El registro público crea usuarios con rol `member`; crea la primera cuenta administradora desde el backend con `python -m app.utils.create_user`.

Las columnas existentes no se convierten automáticamente: el esquema previo puede conservar tipos compatibles distintos, por ejemplo timestamps con zona horaria o `BIGINT`. Revisa esos tipos antes de planificar una migración de normalización.
