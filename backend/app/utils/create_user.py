from getpass import getpass

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.security import Role, User


def main() -> None:
    if SessionLocal is None:
        raise RuntimeError("Configura DATABASE_URL antes de crear usuarios.")
    full_name = input("Nombre completo: ").strip()
    email = input("Correo: ").strip().lower()
    password = getpass("Contraseña (mínimo 12 caracteres): ")
    if len(password) < 12:
        raise ValueError("La contraseña debe tener al menos 12 caracteres.")

    with SessionLocal() as db:
        if db.scalar(select(User.id).where(User.email == email)):
            raise ValueError("Ya existe un usuario con ese correo.")
        role = db.scalar(select(Role).where(Role.name == "admin"))
        if role is None:
            role = Role(name="admin", description="Administrador del sistema")
            db.add(role)
            db.flush()
        db.add(User(
            role_id=role.id,
            full_name=full_name,
            email=email,
            password_hash=hash_password(password),
        ))
        db.commit()
    print("Cuenta administradora creada.")


if __name__ == "__main__":
    main()