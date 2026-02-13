from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.database import Base


class Utente(Base):
    __tablename__ = "utenti"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    creato_il = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<Utente(id={self.id}, username='{self.username}')>"
