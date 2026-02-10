from sqlalchemy import Column, Integer, String, Boolean
from app.database import Base

class Cliente(Base):
    __tablename__ = "clienti"

    id = Column(Integer, primary_key=True)
    nome = Column(String)
    partita_iva = Column(String)
    indirizzo_consegna = Column(String)
    telefono_fisso = Column(String)
    cellulare = Column(String)
    email = Column(String)
    referente = Column(String)
    pedana_standard = Column(String)
    riba = Column(Boolean, default=False)
    note = Column(String)
