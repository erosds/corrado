from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal
from app.schemas.ordine import OrdineList


class CaricoBase(BaseModel):
    trasportatore_id: Optional[int] = None
    tipo_carico: str  # "pedane" o "sfuso"
    data_carico: Optional[date] = None
    stato: str = "aperto"  # "aperto" o "ritirato"
    note: Optional[str] = None


class CaricoCreate(CaricoBase):
    ordini_ids: List[int] = []  # ID degli ordini da aggiungere al carico


class CaricoUpdate(BaseModel):
    trasportatore_id: Optional[int] = None
    data_carico: Optional[date] = None
    stato: Optional[str] = None
    note: Optional[str] = None


class CaricoRead(CaricoBase):
    id: int
    creato_il: datetime

    class Config:
        from_attributes = True

class CaricoList(BaseModel):
    """Schema leggero per liste carichi"""
    id: int
    tipo_carico: str
    stato: str
    data_carico: Optional[date] = None
    trasportatore_nome: Optional[str] = None
    totale_quintali: Decimal = Decimal("0")
    percentuale_completamento: Decimal = Decimal("0")
    is_completo: bool = False
    num_ordini: int = 0

    class Config:
        from_attributes = True
