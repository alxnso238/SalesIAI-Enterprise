# Backend MatrixFlow

API FastAPI con SQLAlchemy y PostgreSQL/Supabase. La sesión de base de datos es usada por los endpoints de negocio, métricas y autenticación. Los payloads actuales de los módulos se guardan en `api_records` como JSON para mantener los contratos del frontend; los usuarios/roles usan sus tablas relacionales.

## Ejecutar

```bash
python -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
test -f .env || cp .env.example .env
alembic upgrade head
.venv/bin/uvicorn app.main:app --reload
```

Documentación interactiva: `http://localhost:8000/docs`

Configura `DATABASE_URL` con la URI PostgreSQL de Supabase, preferiblemente Session Pooler si el host directo no tiene ruta IPv4. `JWT_SECRET_KEY` debe ser un secreto independiente de al menos 32 caracteres; genera uno con `openssl rand -hex 32`. `CORS_ORIGINS` debe ser una lista JSON con los orígenes autorizados.

Crear la cuenta administradora inicial, con contraseña solicitada de forma interactiva:

```bash
python -m app.utils.create_user
```

## Render

El repositorio incluye `render.yaml`. Crea el servicio con **New > Blueprint** y configura la variable privada marcada `sync: false`:

- `DATABASE_URL`: URI PostgreSQL de Supabase, preferiblemente Session Pooler

Render genera `JWT_SECRET_KEY`; `JWT_EXPIRE_MINUTES` queda en 480. `CORS_ORIGINS` ya apunta al dominio de producción en [`render.yaml`](../render.yaml); actualiza ese valor si cambias de dominio Vercel. El servicio usa `backend` como root, instala `requirements.txt`, inicia `uvicorn app.main:app --host 0.0.0.0 --port $PORT` y comprueba `/ready`.

Aplica el esquema una vez con `alembic upgrade head` antes de usar la API. Si ya ejecutaste SQL manual o existen tablas en Supabase, verifica primero `alembic_version` y el esquema; no ejecutes la migración inicial a ciegas porque podría encontrar tablas existentes.

En Vercel configura solo `VITE_API_URL` con la URL pública del servicio Render. No guardes claves PostgreSQL/Supabase en variables `VITE_*`.

## Endpoints iniciales

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register` (cuentas nuevas con rol `viewer`)
- `GET|POST /api/v1/companies`
- `GET|POST /api/v1/vectors`
- `GET|POST /api/v1/matrices`
- `GET|POST /api/v1/operations`
- `GET /api/v1/reports`
- `GET /health`
- `GET /ready`
- `GET|POST|PUT|DELETE /api/v1/resources/{collection}`
- `GET /api/v1/audit` (solo administradores)

Los endpoints de datos requieren `Authorization: Bearer <token>`. El login valida usuarios de la tabla `users`; operaciones, ventas e inventario se persisten y alimentan `/api/v1/reports`.

El rol `admin` puede gestionar todos los módulos y delegar roles desde Usuarios. `member` opera ventas/inventario y matemáticas; `analyst` opera matemáticas y consulta reportes; `viewer` consulta reportes y datos maestros. Las escrituras y cambios de administración se verifican en la API, además de ocultarse en la interfaz.
