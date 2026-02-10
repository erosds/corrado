from sqlalchemy import Column, Integer, Numeric, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class StoricoPrezzo(Base):
    """
    Tiene traccia di tutti i prezzi applicati per ogni combinazione cliente/prodotto.
    Viene popolato automaticamente quando si inserisce un ordine.
    Serve per suggerire l'ultimo prezzo e per consultazione storica.
    """
    __tablename__ = "storico_prezzi"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clienti.id"), nullable=False)
    prodotto_id = Column(Integer, ForeignKey("prodotti.id"), nullable=False)
    prezzo = Column(Numeric(10, 2), nullable=False)  # Prezzo al quintale
    creato_il = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    cliente = relationship("Cliente", back_populates="storico_prezzi")
    prodotto = relationship("Prodotto", back_populates="storico_prezzi")

    def __repr__(self):
        return f"<StoricoPrezzo(cliente_id={self.cliente_id}, prodotto_id={self.prodotto_id}, prezzo={self.prezzo})>"