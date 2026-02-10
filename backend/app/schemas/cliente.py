from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class ClienteBase(BaseModel):
    nome: str
    partita_iva: Optional[str] = None
    indirizzo_consegna: Optional[str] = None
    telefono_fisso: Optional[str] = None
    cellulare: Optional[str] = None
    email: Optional[str] = None
    referente: Optional[str] = None
    pedana_standard: Optional[str] = None  # "8", "10", "12.5"
    riba: bool = False
    note: Optional[str] = None


class ClienteCreate(ClienteBase):
    pass


class ClienteUpdate(BaseModel):
    nome: Optional[str] = None
    partita_iva: Optional[str] = None
    indirizzo_consegna: Optional[str] = None
    telefono_fisso: Optional[str] = None
    cellulare: Optional[str] = None
    email: Optional[str] = None
    referente: Optional[str] = None
    pedana_standard: Optional[str] = None
    riba: Optional[bool] = None
    note: Optional[str] = None


class ClienteRead(ClienteBase):
    id: int
    creato_il: datetime

    class Config:
        from_attributes = True


class ClienteList(BaseModel):
    """Schema leggero per liste di clienti"""
    id: int
    nome: str
    cellulare: Optional[str] = None
    riba: bool
    pedana_standard: Optional[str] = None  # Necessario per calcolo quintali in OrdineNuovo

    class Config:
        from_attributes = True