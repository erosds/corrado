from pydantic import BaseModel
from typing import Optional


class TrasportatoreBase(BaseModel):
    nome: str
    telefono: Optional[str] = None
    note: Optional[str] = None


class TrasportatoreCreate(TrasportatoreBase):
    pass


class TrasportatoreUpdate(BaseModel):
    nome: Optional[str] = None
    telefono: Optional[str] = None
    note: Optional[str] = None


class TrasportatoreRead(TrasportatoreBase):
    id: int

    class Config:
        from_attributes = True
