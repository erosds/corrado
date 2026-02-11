"""
Modello Mulino - Aggiornato con relazione Carichi
"""

from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import relationship
from app.database import Base


class Mulino(Base):
    """
    Mulino fornitore di farine.
    
    Relazioni:
    - prodotti: prodotti venduti dal mulino
    - righe_ordine: righe ordine che referenziano questo mulino
    - carichi: carichi che partono da questo mulino (NUOVO)
    """
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
    
    # NUOVA relazione con Carichi
    carichi = relationship(
        "Carico", 
        back_populates="mulino",
        lazy="dynamic"  # Per query efficienti su molti carichi
    )

    def __repr__(self):
        return f"<Mulino(id={self.id}, nome='{self.nome}')>"