from sqlalchemy import Column, Integer, String, Text, Date, Numeric, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Ordine(Base):
    __tablename__ = "ordini"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clienti.id"), nullable=False)
    data_ordine = Column(Date, nullable=False)
    data_ritiro = Column(Date, nullable=True)
    data_incasso_mulino = Column(Date, nullable=True)  # Per calcolo provvigioni
    tipo_ordine = Column(String(20), nullable=False)  # "pedane" o "sfuso"
    trasportatore_id = Column(Integer, ForeignKey("trasportatori.id"), nullable=True)
    carico_id = Column(Integer, ForeignKey("carichi.id"), nullable=True)
    stato = Column(String(20), default="inserito")  # "inserito" o "ritirato"
    note = Column(Text, nullable=True)
    creato_il = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    cliente = relationship("Cliente", back_populates="ordini")
    trasportatore = relationship("Trasportatore", back_populates="ordini")
    carico = relationship("Carico", back_populates="ordini")
    righe = relationship("RigaOrdine", back_populates="ordine", cascade="all, delete-orphan")

    @property
    def totale_quintali(self):
        return sum(r.quintali or 0 for r in self.righe)

    @property
    def totale_importo(self):
        return sum(r.prezzo_totale or 0 for r in self.righe)

    def __repr__(self):
        return f"<Ordine(id={self.id}, cliente_id={self.cliente_id}, stato='{self.stato}')>"


class RigaOrdine(Base):
    __tablename__ = "righe_ordine"

    id = Column(Integer, primary_key=True, index=True)
    ordine_id = Column(Integer, ForeignKey("ordini.id"), nullable=False)
    prodotto_id = Column(Integer, ForeignKey("prodotti.id"), nullable=False)
    mulino_id = Column(Integer, ForeignKey("mulini.id"), nullable=False)
    pedane = Column(Numeric(10, 2), nullable=True)  # Numero pedane (se ordine a pedane)
    quintali = Column(Numeric(10, 2), nullable=False)  # Quintali totali
    prezzo_quintale = Column(Numeric(10, 2), nullable=False)
    prezzo_totale = Column(Numeric(12, 2), nullable=False)  # quintali * prezzo_quintale

    # Relationships
    ordine = relationship("Ordine", back_populates="righe")
    prodotto = relationship("Prodotto", back_populates="righe_ordine")
    mulino = relationship("Mulino", back_populates="righe_ordine")

    def __repr__(self):
        return f"<RigaOrdine(id={self.id}, prodotto_id={self.prodotto_id}, quintali={self.quintali})>"