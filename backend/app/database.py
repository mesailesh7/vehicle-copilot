import os
from sqlmodel import SQLModel, create_engine, Session

sqlite_file_name = os.getenv("DATABASE_FILE", "vehicle_copilot.db")
if sqlite_file_name.startswith("sqlite://"):
    sqlite_url = sqlite_file_name
else:
    sqlite_url = f"sqlite:///{sqlite_file_name}"

engine = create_engine(sqlite_url, echo=True, connect_args={"check_same_thread": False})

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session