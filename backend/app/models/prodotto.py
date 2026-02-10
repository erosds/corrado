from sqlalchemy import Column, Integer, String, Text, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Prodotto(Base):
    __tablename__ = "prodotti"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(255), nullable=False, index=True)
    mulino_id = Column(Integer, ForeignKey("mulini.id"), nullable=False)
    tipologia = Column(String(50), nullable=True)  # "0", "00", "altro"
    tipo_provvigione = Column(String(20), default="percentuale")  # "percentuale" o "fisso"
    valore_provvigione = Column(Numeric(10, 2), default=3)  # 3% default oppure €/quintale
    note = Column(Text, nullable=True)

    # Relationships
    mulino = relationship("Mulino", back_populates="prodotti")
    righe_ordine = relationship("RigaOrdine", back_populates="prodotto")
    storico_prezzi = relationship("StoricoPrezzo", back_populates="prodotto")

    def __repr__(self):
        return f"<Prodotto(id={self.id}, nome='{self.nome}', mulino_id={self.mulino_id})>"