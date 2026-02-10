from pydantic import BaseModel
from typing import Optional


class MulinoBase(BaseModel):
    nome: str
    indirizzo_ritiro: Optional[str] = None
    telefono: Optional[str] = None
    email1: Optional[str] = None
    email2: Optional[str] = None
    email3: Optional[str] = None
    note: Optional[str] = None


class MulinoCreate(MulinoBase):
    pass


class MulinoUpdate(BaseModel):
    nome: Optional[str] = None
    indirizzo_ritiro: Optional[str] = None
    telefono: Optional[str] = None
    email1: Optional[str] = None
    email2: Optional[str] = None
    email3: Optional[str] = None
    note: Optional[str] = None


class MulinoRead(MulinoBase):
    id: int

    class Config:
        from_attributes = True