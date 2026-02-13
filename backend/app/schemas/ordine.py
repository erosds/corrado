from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal


# --- Riga Ordine ---

class RigaOrdineBase(BaseModel):
    prodotto_id: int
    mulino_id: int
    pedane: Optional[Decimal] = None
    quintali: Decimal
    prezzo_quintale: Decimal
    prezzo_totale: Decimal


class RigaOrdineCreate(RigaOrdineBase):
    pass


class RigaOrdineRead(RigaOrdineBase):
    id: int

    class Config:
        from_attributes = True


class RigaOrdineDettaglio(RigaOrdineRead):
    """Riga con nomi prodotto e mulino"""
    prodotto_nome: Optional[str] = None
    prodotto_tipologia: Optional[str] = None  # Tipo farina (0, 00, altro)
    mulino_nome: Optional[str] = None
    mulino_indirizzo: Optional[str] = None  # Indirizzo ritiro mulino


# --- Schema leggero per righe nella lista ordini ---
class RigaOrdineLista(BaseModel):
    """Riga leggera per visualizzazione in lista ordini"""
    id: int
    pedane: Optional[Decimal] = None
    prodotto_nome: Optional[str] = None
    prodotto_tipologia: Optional[str] = None
    mulino_id: Optional[int] = None
    mulino_nome: Optional[str] = None
    quintali: Decimal
    prezzo_quintale: Optional[Decimal] = None
    prezzo_totale: Optional[Decimal] = None

    class Config:
        from_attributes = True


# --- Ordine ---

class OrdineBase(BaseModel):
    cliente_id: int
    data_ordine: date
    data_ritiro: Optional[date] = None
    data_incasso_mulino: Optional[date] = None
    tipo_ordine: str  # "pedane" o "sfuso"
    trasportatore_id: Optional[int] = None
    carico_id: Optional[int] = None
    stato: str = "inserito"
    note: Optional[str] = None


class OrdineCreate(OrdineBase):
    righe: List[RigaOrdineCreate]

class OrdineUpdate(BaseModel):
    cliente_id: Optional[int] = None
    data_ordine: Optional[date] = None
    data_ritiro: Optional[date] = None
    data_incasso_mulino: Optional[date] = None
    tipo_ordine: Optional[str] = None
    trasportatore_id: Optional[int] = None
    note: Optional[str] = None

    righe: Optional[List[RigaOrdineCreate]] = None

class OrdineRead(OrdineBase):
    id: int
    creato_il: datetime
    righe: List[RigaOrdineRead] = []

    class Config:
        from_attributes = True


class OrdineList(BaseModel):
    """Schema per liste ordini con righe"""
    id: int
    cliente_id: int
    cliente_nome: Optional[str] = None
    data_ordine: date
    data_ritiro: Optional[date] = None
    data_incasso_mulino: Optional[date] = None
    tipo_ordine: str
    stato: str
    trasportatore_id: Optional[int] = None
    trasportatore_nome: Optional[str] = None
    carico_id: Optional[int] = None
    totale_quintali: Optional[Decimal] = None
    totale_importo: Optional[Decimal] = None
    righe: List[RigaOrdineLista] = []  # Righe con dettagli prodotto/mulino

    class Config:
        from_attributes = True


class OrdineDettaglio(OrdineRead):
    """Ordine completo con tutti i dettagli"""
    cliente_nome: Optional[str] = None
    cliente_indirizzo: Optional[str] = None  # Indirizzo consegna cliente
    trasportatore_nome: Optional[str] = None
    righe: List[RigaOrdineDettaglio] = []

    class Config:
        from_attributes = True