from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import relationship
from app.database import Base


class Mulino(Base):
    __tablename__ = "mulini"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(255), nullable=False, index=True)
    indirizzo_ritiro = Column(Text, nullable=True)
    telefono = Column(String(30), nullable=True)
    email1 = Column(String(255), nullable=True)
    email2 = Column(String(255), nullable=True)
    email3 = Column(String(255), nullable=True)
    note = Column(Text, nullable=True)

    # Relationships
    prodotti = relationship("Prodotto", back_populates="mulino")
    righe_ordine = relationship("RigaOrdine", back_populates="mulino")

    def __repr__(self):
        return f"<Mulino(id={self.id}, nome='{self.nome}')>"