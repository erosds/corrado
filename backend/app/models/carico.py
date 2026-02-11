"""
Modello Carico - Aggregatore logistico di Ordini

Versione aggiornata con:
- mulino_id obbligatorio (vincolo: stesso mulino per tutti gli ordini)
- total_quantita cached per performance
- Stati: BOZZA, ASSEGNATO, RITIRATO, CONSEGNATO
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


class StatoCarico(str, Enum):
    """Stati del ciclo di vita di un Carico"""
    BOZZA = "bozza"           # Creato senza trasportatore/data
    ASSEGNATO = "assegnato"   # Trasportatore e data_ritiro assegnati
    RITIRATO = "ritirato"     # Merce ritirata dal mulino
    CONSEGNATO = "consegnato" # Consegnato al cliente


class TipoCarico(str, Enum):
    """Tipologie di carico"""
    SFUSO = "sfuso"
    PEDANE = "pedane"


class Carico(Base):
    """
    Carico - Aggregatore logistico di Ordini.
    
    Regole di dominio:
    - Un Carico contiene 1..N Ordini
    - Tutti gli ordini devono avere lo stesso mulino
    - Tutti gli ordini devono avere lo stesso tipo (sfuso/pedane)
    - Somma quantità <= 300 quintali
    - Può esistere in stato BOZZA (senza trasportatore e data_ritiro)
    """
    __tablename__ = "carichi"

    # === Campi principali ===
    id = Column(Integer, primary_key=True, index=True)
    
    # Vincolo mulino (NUOVO - tutti gli ordini stesso mulino)
    mulino_id = Column(
        Integer, 
        ForeignKey("mulini.id"), 
        nullable=False,
        index=True,
        comment="Mulino di ritiro - tutti gli ordini devono appartenere a questo mulino"
    )
    
    # Tipo carico
    tipo = Column(
        String(20), 
        nullable=False,
        comment="Tipo carico: sfuso o pedane"
    )
    
    # Trasportatore (nullable per stato BOZZA)
    trasportatore_id = Column(
        Integer, 
        ForeignKey("trasportatori.id"), 
        nullable=True,
        comment="Trasportatore assegnato - può essere NULL in stato BOZZA"
    )
    
    # Data ritiro (nullable per stato BOZZA)
    data_ritiro = Column(
        Date, 
        nullable=True,
        comment="Data prevista ritiro - può essere NULL in stato BOZZA"
    )
    
    # Stato del carico
    stato = Column(
        String(20), 
        default=StatoCarico.BOZZA.value,
        nullable=False,
        index=True,
        comment="Stato: bozza, assegnato, ritirato, consegnato"
    )
    
    # Totale quintali CACHED (NUOVO - per performance)
    total_quantita = Column(
        Numeric(10, 2), 
        default=Decimal("0"),
        nullable=False,
        comment="Totale quintali cached - sincronizzato quando cambiano ordini"
    )
    
    # Note
    note = Column(Text, nullable=True)
    
    # Timestamp
    creato_il = Column(DateTime(timezone=True), server_default=func.now())
    aggiornato_il = Column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now()
    )

    # === Relationships ===
    mulino = relationship("Mulino", back_populates="carichi")
    trasportatore = relationship("Trasportatore", back_populates="carichi")
    ordini = relationship(
        "Ordine", 
        back_populates="carico",
        lazy="dynamic"  # Per query efficienti su molti ordini
    )

    # === Costanti di dominio ===
    MAX_QUINTALI = Decimal("300")
    SOGLIA_MINIMA_QUINTALI = Decimal("280")
    SOGLIA_ORDINE_SINGOLO = Decimal("280")  # Ordine >= 280 diventa carico automatico

    # === Indici composti per performance ===
    __table_args__ = (
        # Indice per ricerche frequenti
        Index('idx_carichi_mulino_tipo_stato', 'mulino_id', 'tipo', 'stato'),
        # Indice per lista carichi aperti
        Index('idx_carichi_stato_data', 'stato', 'data_ritiro'),
        # Constraint: tipo deve essere sfuso o pedane
        CheckConstraint(
            "tipo IN ('sfuso', 'pedane')",
            name='check_tipo_carico'
        ),
        # Constraint: stato deve essere valido
        CheckConstraint(
            "stato IN ('bozza', 'assegnato', 'ritirato', 'consegnato')",
            name='check_stato_carico'
        ),
        # Constraint: total_quantita non può superare 300
        CheckConstraint(
            "total_quantita <= 300",
            name='check_max_quantita'
        ),
    )

    # === Properties ===
    @property
    def quintali_disponibili(self) -> Decimal:
        """Quintali ancora disponibili nel carico"""
        return self.MAX_QUINTALI - (self.total_quantita or Decimal("0"))

    @property
    def quintali_mancanti_minimo(self) -> Decimal:
        """Quintali mancanti per raggiungere la soglia minima"""
        return max(Decimal("0"), self.SOGLIA_MINIMA_QUINTALI - (self.total_quantita or Decimal("0")))

    @property
    def is_completo(self) -> bool:
        """True se il carico ha raggiunto almeno la soglia minima"""
        return (self.total_quantita or Decimal("0")) >= self.SOGLIA_MINIMA_QUINTALI

    @property
    def is_pronto_assegnazione(self) -> bool:
        """True se il carico può passare da BOZZA ad ASSEGNATO"""
        return self.is_completo and self.stato == StatoCarico.BOZZA.value

    @property
    def percentuale_completamento(self) -> Decimal:
        """Percentuale di completamento rispetto al massimo"""
        if self.MAX_QUINTALI == 0:
            return Decimal("0")
        return min(
            Decimal("100"), 
            ((self.total_quantita or Decimal("0")) / self.MAX_QUINTALI) * 100
        )

    @property
    def num_ordini(self) -> int:
        """Numero di ordini nel carico"""
        return self.ordini.count()

    # === Metodi di validazione ===
    def can_add_order(self, ordine_quantita: Decimal) -> tuple[bool, str]:
        """
        Verifica se un ordine può essere aggiunto al carico.
        Ritorna (True, "") se OK, (False, "motivo") altrimenti.
        """
        if self.stato != StatoCarico.BOZZA.value:
            return False, f"Carico non modificabile: stato '{self.stato}'"
        
        nuova_quantita = (self.total_quantita or Decimal("0")) + ordine_quantita
        if nuova_quantita > self.MAX_QUINTALI:
            return False, f"Superato limite: {nuova_quantita}q > {self.MAX_QUINTALI}q"
        
        return True, ""

    def __repr__(self):
        return (
            f"<Carico(id={self.id}, mulino_id={self.mulino_id}, "
            f"tipo='{self.tipo}', stato='{self.stato}', "
            f"total_quantita={self.total_quantita})>"
        )