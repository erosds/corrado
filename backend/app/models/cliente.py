from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Cliente(Base):
    __tablename__ = "clienti"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(255), nullable=False, index=True)
    partita_iva = Column(String(20), nullable=True)
    indirizzo_consegna = Column(Text, nullable=True)
    telefono_fisso = Column(String(30), nullable=True)
    cellulare = Column(String(30), nullable=True)
    email = Column(String(255), nullable=True)
    referente = Column(String(255), nullable=True)
    pedana_standard = Column(String(10), nullable=True)  # "8", "10", "12.5"
    riba = Column(Boolean, default=False)  # Se True, calcola data incasso automatica (+60gg fine mese)
    note = Column(Text, nullable=True)
    creato_il = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    ordini = relationship("Ordine", back_populates="cliente")
    storico_prezzi = relationship("StoricoPrezzo", back_populates="cliente")

    def __repr__(self):
        return f"<Cliente(id={self.id}, nome='{self.nome}')>"