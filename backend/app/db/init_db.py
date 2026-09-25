import argparse

from sqlalchemy import inspect, select, text

from app.core.security import hash_password
from app.db.base import Base, SessionLocal, engine
from app.models import User, UserRole
from app.services.seed_loader import load_standards_seed


def init_db() -> None:
    with engine.begin() as connection:
        if connection.dialect.name == "postgresql":
            connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        Base.metadata.create_all(bind=connection)

    with SessionLocal() as session:
        admin = session.scalar(
            select(User).where(User.email == "admin@NIRIKSHAN.ai")
        )
        if admin is None:
            session.add(
                User(
                    email="admin@NIRIKSHAN.ai",
                    hashed_password=hash_password("Admin@123"),
                    full_name="NIRIKSHAN Administrator",
                    role=UserRole.ADMIN,
                )
            )
            session.commit()


def table_names() -> list[str]:
    return sorted(inspect(engine).get_table_names())


def main() -> None:
    parser = argparse.ArgumentParser(description="Initialize the NIRIKSHAN database")
    parser.add_argument(
        "--seed",
        action="store_true",
        help="Load the prototype standards and relationship seed data",
    )
    args = parser.parse_args()

    init_db()
    if args.seed:
        standards, relationships = load_standards_seed()
        print(
            f"Seed complete: {standards} standards, "
            f"{relationships} relationships inserted."
        )
    else:
        print("Database initialization complete.")


if __name__ == "__main__":
    main()
