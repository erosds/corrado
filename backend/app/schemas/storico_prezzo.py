from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal


class StoricoPrezzoRead(BaseModel):
    id: int
    cliente_id: int
    prodotto_id: int
    prezzo: Decimal
    creato_il: datetime

    class Config:
        from_attributes = True


class StoricoPrezzoDettaglio(StoricoPrezzoRead):
    """Storico prezzo con nomi"""
    prodotto_nome: Optional[str] = None
    mulino_nome: Optional[str] = None


class UltimoPrezzoRead(BaseModel):
    """Ultimo prezzo per cliente/prodotto - usato per suggerimento in inserimento ordine"""
    cliente_id: int
    prodotto_id: int
    prodotto_nome: str
    mulino_id: int
    mulino_nome: str
    ultimo_prezzo: Decimal
    data_ultimo_ordine: datetime

    class Config:
        from_attributes = True


class PrezziClienteResponse(BaseModel):
    """Risposta con tutti gli ultimi prezzi per un cliente, raggruppati per mulino"""
    cliente_id: int
    cliente_nome: str
    prezzi: list[UltimoPrezzoRead]

    class Config:
        from_attributes = True
