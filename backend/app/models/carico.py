from sqlalchemy import Column, Integer, String, Text, Date, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Carico(Base):
    """
    Carico completo di trasporto.
    Raggruppa più ordini per ottimizzare il trasporto (obiettivo 300 quintali, minimo 280).
    Può includere ordini da mulini diversi ma mai misto pedane/sfuso.
    """
    __tablename__ = "carichi"

    id = Column(Integer, primary_key=True, index=True)
    trasportatore_id = Column(Integer, ForeignKey("trasportatori.id"), nullable=True)
    tipo_carico = Column(String(20), nullable=False)  # "pedane" o "sfuso"
    data_carico = Column(Date, nullable=True)
    stato = Column(String(20), default="aperto")  # "aperto" o "ritirato"
    note = Column(Text, nullable=True)
    creato_il = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    trasportatore = relationship("Trasportatore", back_populates="carichi")
    ordini = relationship("Ordine", back_populates="carico")

    # Costanti per logica carico
    OBIETTIVO_QUINTALI = 300
    SOGLIA_MINIMA_QUINTALI = 280

    @property
    def totale_quintali(self):
        """Somma quintali di tutti gli ordini nel carico"""
        return sum(ordine.totale_quintali for ordine in self.ordini)

    @property
    def quintali_mancanti(self):
        """Quintali mancanti per raggiungere l'obiettivo"""
        return max(0, self.OBIETTIVO_QUINTALI - self.totale_quintali)

    @property
    def is_completo(self):
        """True se il carico ha raggiunto almeno la soglia minima"""
        return self.totale_quintali >= self.SOGLIA_MINIMA_QUINTALI

    @property
    def percentuale_completamento(self):
        """Percentuale di completamento rispetto all'obiettivo"""
        return min(100, (self.totale_quintali / self.OBIETTIVO_QUINTALI) * 100)

    def __repr__(self):
        return f"<Carico(id={self.id}, tipo='{self.tipo_carico}', stato='{self.stato}', quintali={self.totale_quintali})>"