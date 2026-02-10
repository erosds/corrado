from pydantic import BaseModel
from typing import Optional
from decimal import Decimal


class ProdottoBase(BaseModel):
    nome: str
    mulino_id: int
    tipologia: Optional[str] = None  # "0", "00", "altro"
    tipo_provvigione: str = "percentuale"  # "percentuale" o "fisso"
    valore_provvigione: Decimal = Decimal("3")
    note: Optional[str] = None


class ProdottoCreate(ProdottoBase):
    pass


class ProdottoUpdate(BaseModel):
    nome: Optional[str] = None
    mulino_id: Optional[int] = None
    tipologia: Optional[str] = None
    tipo_provvigione: Optional[str] = None
    valore_provvigione: Optional[Decimal] = None
    note: Optional[str] = None


class ProdottoRead(ProdottoBase):
    id: int

    class Config:
        from_attributes = True


class ProdottoConMulino(ProdottoRead):
    """Prodotto con nome del mulino incluso"""
    mulino_nome: Optional[str] = None

    class Config:
        from_attributes = True
