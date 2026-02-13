"""
Modello Ordine - Aggiornato con stato logistico per integrazione Carichi

Aggiunte:
- stato_logistico: APERTO, IN_CLUSTER, IN_CARICO, SPEDITO
- Indici per performance su carico_id e campi ricerca
"""

from sqlalchemy import (
    Column, Integer, String, Text, Date, Numeric, 
    ForeignKey, DateTime, Index, CheckConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from decimal import Decimal
from enum import Enum
from app.database import Base


class StatoLogisticoOrdine(str, Enum):
    """Stati logistici dell'ordine nel ciclo di spedizione"""
    APERTO = "aperto"           # Ordine creato, non ancora in nessun carico
    IN_CLUSTER = "in_cluster"   # Ordine raggruppato in bozza carico (drag&drop)
    IN_CARICO = "in_carico"     # Ordine in carico assegnato a trasportatore
    SPEDITO = "spedito"         # Ordine ritirato/spedito


class Ordine(Base):
    """
    Ordine cliente.
    
    Relazione con Carico:
    - Un Ordine può appartenere a 0 o 1 Carico
    - carico_id nullable
    - stato_logistico traccia il ciclo di spedizione
    """
    __tablename__ = "ordini"

    # === Campi principali ===
    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clienti.id"), nullable=False, index=True)
    data_ordine = Column(Date, nullable=False)
    data_ritiro = Column(Date, nullable=True)
    data_incasso_mulino = Column(Date, nullable=True)  # Per calcolo provvigioni RIBA
    
    tipo_ordine = Column(
        String(20), 
        nullable=False,
        comment="Tipo: pedane o sfuso"
    )
    
    trasportatore_id = Column(
        Integer, 
        ForeignKey("trasportatori.id"), 
        nullable=True,
        index=True
    )
    
    # === Relazione con Carico ===
    carico_id = Column(
        Integer, 
        ForeignKey("carichi.id"), 
        nullable=True,
        index=True,
        comment="FK al carico - NULL se ordine non assegnato"
    )
    
    # === Stati ===
    # Stato ordine (legacy - mantenuto per compatibilità)
    stato = Column(
        String(20), 
        default="inserito",
        comment="Stato ordine legacy: inserito, ritirato"
    )
    
    # Stato logistico (NUOVO)
    stato_logistico = Column(
        String(20),
        default=StatoLogisticoOrdine.APERTO.value,
        nullable=False,
        index=True,
        comment="Stato logistico: aperto, in_cluster, in_carico, spedito"
    )
    
    # Email
    email_inviata_il = Column(DateTime(timezone=True), nullable=True)

    # Note e timestamp
    note = Column(Text, nullable=True)
    creato_il = Column(DateTime(timezone=True), server_default=func.now())
    aggiornato_il = Column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now()
    )

    # === Relationships ===
    cliente = relationship("Cliente", back_populates="ordini")
    trasportatore = relationship("Trasportatore", back_populates="ordini")
    carico = relationship("Carico", back_populates="ordini")
    righe = relationship(
        "RigaOrdine", 
        back_populates="ordine", 
        cascade="all, delete-orphan",
        lazy="joined"  # Carica righe insieme all'ordine
    )

    # === Indici composti per performance ===
    __table_args__ = (
        # Indice per ricerca ordini disponibili per carico
        Index('idx_ordini_carico_stato', 'carico_id', 'stato_logistico'),
        # Indice per composizione carichi (ordini non assegnati)
        Index('idx_ordini_tipo_stato_logistico', 'tipo_ordine', 'stato_logistico'),
        # Constraint: tipo_ordine deve essere valido
        CheckConstraint(
            "tipo_ordine IN ('sfuso', 'pedane')",
            name='check_tipo_ordine'
        ),
        # Constraint: stato_logistico deve essere valido
        CheckConstraint(
            "stato_logistico IN ('aperto', 'in_cluster', 'in_carico', 'spedito')",
            name='check_stato_logistico'
        ),
    )

    # === Properties ===
    @property
    def totale_quintali(self) -> Decimal:
        """Somma quintali di tutte le righe"""
        return sum((r.quintali or Decimal("0")) for r in self.righe)

    @property
    def totale_importo(self) -> Decimal:
        """Somma importi di tutte le righe"""
        return sum((r.prezzo_totale or Decimal("0")) for r in self.righe)

    @property
    def mulino_principale_id(self) -> int | None:
        """
        ID del mulino con più quintali nell'ordine.
        Usato per determinare la compatibilità con un Carico.
        """
        if not self.righe:
            return None
        
        # Raggruppa quintali per mulino
        mulini_quintali: dict[int, Decimal] = {}
        for riga in self.righe:
            mulino_id = riga.mulino_id
            mulini_quintali[mulino_id] = mulini_quintali.get(mulino_id, Decimal("0")) + (riga.quintali or Decimal("0"))
        
        if not mulini_quintali:
            return None
        
        # Ritorna il mulino con più quintali
        return max(mulini_quintali, key=mulini_quintali.get)

    @property
    def is_assegnabile_carico(self) -> bool:
        """True se l'ordine può essere assegnato a un carico"""
        return (
            self.carico_id is None and 
            self.stato_logistico == StatoLogisticoOrdine.APERTO.value
        )

    @property
    def is_ordine_grande(self) -> bool:
        """True se l'ordine è >= 280q (diventa carico automaticamente)"""
        return self.totale_quintali >= Decimal("280")

    def __repr__(self):
        return (
            f"<Ordine(id={self.id}, cliente_id={self.cliente_id}, "
            f"stato_logistico='{self.stato_logistico}', "
            f"carico_id={self.carico_id})>"
        )


class RigaOrdine(Base):
    """Riga dettaglio ordine - un prodotto con quantità e prezzo"""
    __tablename__ = "righe_ordine"

    id = Column(Integer, primary_key=True, index=True)
    ordine_id = Column(Integer, ForeignKey("ordini.id"), nullable=False, index=True)
    prodotto_id = Column(Integer, ForeignKey("prodotti.id"), nullable=False, index=True)
    mulino_id = Column(Integer, ForeignKey("mulini.id"), nullable=False, index=True)
    
    pedane = Column(Numeric(10, 2), nullable=True)  # Numero pedane (se ordine a pedane)
    quintali = Column(Numeric(10, 2), nullable=False)  # Quintali totali
    prezzo_quintale = Column(Numeric(10, 2), nullable=False)
    prezzo_totale = Column(Numeric(12, 2), nullable=False)  # quintali * prezzo_quintale

    # Relationships
    ordine = relationship("Ordine", back_populates="righe")
    prodotto = relationship("Prodotto", back_populates="righe_ordine")
    mulino = relationship("Mulino", back_populates="righe_ordine")

    # Indice per query composizione carichi
    __table_args__ = (
        Index('idx_righe_ordine_mulino', 'ordine_id', 'mulino_id'),
    )

    def __repr__(self):
        return f"<RigaOrdine(id={self.id}, prodotto_id={self.prodotto_id}, quintali={self.quintali})>"