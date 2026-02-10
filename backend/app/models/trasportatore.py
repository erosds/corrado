from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import relationship
from app.database import Base


class Trasportatore(Base):
    __tablename__ = "trasportatori"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(255), nullable=False, index=True)
    telefono = Column(String(30), nullable=True)
    note = Column(Text, nullable=True)

    # Relationships
    ordini = relationship("Ordine", back_populates="trasportatore")
    carichi = relationship("Carico", back_populates="trasportatore")

    def __repr__(self):
        return f"<Trasportatore(id={self.id}, nome='{self.nome}')>"