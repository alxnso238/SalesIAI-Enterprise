# Backend SalesIA Enterprise

API FastAPI con SQLAlchemy y PostgreSQL/Supabase. La sesión de base de datos es usada por los endpoints de negocio, métricas y autenticación. Los payloads actuales de los módulos se guardan en `api_records` como JSON para mantener los contratos del frontend; los usuarios/roles usan sus tablas relacionales.

## Ejecutar

```bash
python -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
cp .env.example .env
# Edit .env with your Supabase DATABASE_URL and a private JWT_SECRET_KEY.
# Skip the next line if you initialized Supabase by pasting database/supabase_schema.sql.
alembic upgrade head
.venv/bin/python -m app.utils.create_user
.venv/bin/uvicorn app.main:app --reload
```

Documentación interactiva: `http://localhost:8000/docs`

En `backend/.env`, usa la URI **Session pooler** de Supabase (puerto 5432) con `sslmode=require`; reemplaza los marcadores de `backend/.env.example` por los valores de **Connect > Session pooler** en Supabase. Si la contraseña contiene caracteres especiales, codifícalos como URL encoding. `JWT_SECRET_KEY` debe ser un secreto independiente de al menos 32 caracteres; genera uno con `openssl rand -hex 32`. `CORS_ORIGINS` debe ser una lista JSON con los orígenes frontend autorizados. Las plantillas `backend/.env.example` y `.env.example` no contienen credenciales.

La aplicación actual accede a PostgreSQL con SQLAlchemy y necesita `DATABASE_URL`. Las variables `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` y `SUPABASE_JWKS_URL` que aparecen en la opción **Server** del panel son para la API/SDK de Supabase; no sustituyen la URI de PostgreSQL y no son necesarias para esta conexión. No pongas contraseñas ni claves secretas en variables `VITE_*` del frontend.

El primer administrador se crea tras aplicar las migraciones. El comando solicita nombre, correo y contraseña interactivamente; no escribas contraseñas en archivos ni en comandos:

```bash
python -m app.utils.create_user
```

## Supabase nuevo

1. Crea un proyecto Supabase y copia la cadena PostgreSQL del **Session pooler** (puerto 5432); codifica caracteres especiales de la contraseña como URL encoding.
2. Pega y ejecuta el archivo completo [`database/supabase_schema.sql`](../database/supabase_schema.sql) en Supabase SQL Editor.
3. Completa `backend/.env` con ese `DATABASE_URL` y crea el administrador con `python -m app.utils.create_user`.
4. Conserva el mismo `DATABASE_URL` para la variable privada del servicio Render.

Para una base nueva, usa **Alembic o** el script `database/supabase_schema.sql` en SQL Editor, nunca ambos. Si optas por Alembic, no ejecutes después el script SQL: este último crea las mismas tablas y marca la revisión en `alembic_version`.

## Render y Vercel

En Render selecciona **New > Blueprint** para aplicar [`render.yaml`](../render.yaml). Configura `DATABASE_URL` y `CORS_ORIGINS` cuando el Blueprint lo solicite. Render genera `JWT_SECRET_KEY`; conserva `JWT_EXPIRE_MINUTES=480`. `CORS_ORIGINS` es una lista JSON con el origen exacto de Vercel, por ejemplo `["https://salesia-web.vercel.app"]`; añade `http://localhost:5173` si también vas a probar localmente. No actives el tráfico de frontend hasta que `GET /ready` responda correctamente.

En Vercel importa el repositorio con raíz `/`, build `npm run build`, carpeta de salida `dist`, y define `VITE_API_URL` con la URL pública que Render asignó. No guardes `DATABASE_URL`, contraseñas ni claves Supabase en variables `VITE_*`. Si el dominio de Vercel cambia, actualiza `CORS_ORIGINS` en Render.

## Endpoints iniciales

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register` (cuentas nuevas con rol `viewer`)
- `GET|POST /api/v1/companies`
- `GET /api/v1/reports`
- `GET /api/v1/statistics/analytics` (resumen de ventas completadas)
- `POST /api/v1/statistics/mean`
- `POST /api/v1/statistics/median`
- `POST /api/v1/statistics/compare`
- `POST /api/v1/statistics/bayes`
- `POST /api/v1/statistics/random-variables/analyze`
- `GET /api/v1/statistics/history`
- `GET /health`
- `GET /ready`
- `GET|POST|PUT|DELETE /api/v1/resources/{collection}`
- `GET /api/v1/audit` (solo administradores)

Los endpoints de datos requieren `Authorization: Bearer <token>`. El login valida usuarios de la tabla `users`; operaciones, ventas e inventario se persisten y alimentan `/api/v1/reports`.

Analytics usa las ventas guardadas en `api_records`, calcula estadísticas sobre ventas completadas y registra cada cálculo en esa misma tabla bajo la colección `statistical_analyses`, con su evento de auditoría. El esquema también incluye las tablas relacionales de Analytics descritas en [`database/README.md`](../database/README.md), pero los endpoints actuales aún no migran sus escrituras a esas tablas. Las ventas canceladas no se incluyen en el resumen.

El rol `admin` puede gestionar todos los módulos y delegar roles desde Usuarios. `member` opera ventas e inventario; `analyst` consulta Analytics y reportes; `viewer` consulta reportes y datos maestros. Las escrituras y cambios de administración se verifican en la API, además de ocultarse en la interfaz.
