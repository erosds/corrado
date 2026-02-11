"""
Schema Pydantic per Carico

Versione aggiornata con:
- mulino_id obbligatorio
- total_quantita
- Stati: BOZZA, ASSEGNATO, RITIRATO, CONSEGNATO
"""

from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal
from enum import Enum


# === Enum per validazione ===

class StatoCarico(str, Enum):
    BOZZA = "bozza"
    ASSEGNATO = "assegnato"
    RITIRATO = "ritirato"
    CONSEGNATO = "consegnato"


class TipoCarico(str, Enum):
    SFUSO = "sfuso"
    PEDANE = "pedane"


# === Schema base ===

class CaricoBase(BaseModel):
    """Campi comuni a tutti gli schema Carico"""
    mulino_id: int = Field(..., description="ID mulino di ritiro - obbligatorio")
    tipo: TipoCarico = Field(..., description="Tipo carico: sfuso o pedane")
    trasportatore_id: Optional[int] = Field(None, description="ID trasportatore - può essere NULL in bozza")
    data_ritiro: Optional[date] = Field(None, description="Data ritiro prevista - può essere NULL in bozza")
    stato: StatoCarico = Field(default=StatoCarico.BOZZA, description="Stato del carico")
    note: Optional[str] = None


# === Schema per creazione ===

class CaricoCreate(BaseModel):
    """Schema per creare un nuovo carico"""
    mulino_id: int = Field(..., description="ID mulino di ritiro")
    tipo: TipoCarico = Field(..., description="Tipo carico: sfuso o pedane")
    trasportatore_id: Optional[int] = Field(None, description="ID trasportatore (opzionale per bozza)")
    data_ritiro: Optional[date] = Field(None, description="Data ritiro (opzionale per bozza)")
    ordini_ids: List[int] = Field(default=[], description="ID ordini da includere nel carico")
    note: Optional[str] = None

    @model_validator(mode='after')
    def validate_assegnazione(self):
        """Se ha trasportatore e data, non è più bozza"""
        # Questa validazione è informativa, lo stato viene gestito dal service
        return self


class CaricoCreateDraft(BaseModel):
    """Schema per creare carico in BOZZA (drag&drop ordini piccoli)"""
    ordini_ids: List[int] = Field(..., min_length=1, description="ID ordini da raggruppare")
    note: Optional[str] = None

    @field_validator('ordini_ids')
    @classmethod
    def ordini_non_vuoti(cls, v):
        if not v:
            raise ValueError("Almeno un ordine richiesto")
        return v


# === Schema per aggiornamento ===

class CaricoUpdate(BaseModel):
    """Schema per aggiornare un carico"""
    trasportatore_id: Optional[int] = None
    data_ritiro: Optional[date] = None
    stato: Optional[StatoCarico] = None
    note: Optional[str] = None


class CaricoAssignTransport(BaseModel):
    """Schema specifico per assegnare trasportatore e data a un carico BOZZA"""
    trasportatore_id: int = Field(..., description="ID trasportatore - obbligatorio")
    data_ritiro: date = Field(..., description="Data ritiro - obbligatoria")
    
    @field_validator('data_ritiro')
    @classmethod
    def data_futura(cls, v):
        if v < date.today():
            raise ValueError("Data ritiro deve essere oggi o futura")
        return v


# === Schema per lettura ===

class CaricoRead(CaricoBase):
    """Schema completo per lettura singolo carico"""
    id: int
    total_quantita: Decimal = Field(default=Decimal("0"), description="Totale quintali nel carico")
    creato_il: datetime
    aggiornato_il: Optional[datetime] = None
    
    # Campi calcolati
    mulino_nome: Optional[str] = None
    trasportatore_nome: Optional[str] = None
    num_ordini: int = 0
    quintali_disponibili: Decimal = Decimal("300")
    percentuale_completamento: Decimal = Decimal("0")
    is_completo: bool = False

    class Config:
        from_attributes = True


class CaricoList(BaseModel):
    """Schema leggero per liste carichi (performance)"""
    id: int
    mulino_id: int
    mulino_nome: Optional[str] = None
    tipo: str
    stato: str
    data_ritiro: Optional[date] = None
    trasportatore_id: Optional[int] = None
    trasportatore_nome: Optional[str] = None
    total_quantita: Decimal = Decimal("0")
    percentuale_completamento: Decimal = Decimal("0")
    is_completo: bool = False
    num_ordini: int = 0

    class Config:
        from_attributes = True


class CaricoConOrdini(CaricoRead):
    """Schema carico con lista ordini inclusi"""
    ordini: List["OrdineInCarico"] = []

    class Config:
        from_attributes = True


# === Schema ordine dentro carico ===

class OrdineInCarico(BaseModel):
    """Schema leggero per ordine visualizzato dentro un carico"""
    id: int
    cliente_id: int
    cliente_nome: Optional[str] = None
    data_ordine: date
    data_ritiro: Optional[date] = None
    tipo_ordine: str
    stato_logistico: str
    totale_quintali: Decimal = Decimal("0")

    class Config:
        from_attributes = True


# === Schema per operazioni su ordini nel carico ===

class AddOrdineToCarico(BaseModel):
    """Schema per aggiungere ordine a carico esistente"""
    ordine_id: int = Field(..., description="ID ordine da aggiungere")


class RemoveOrdineFromCarico(BaseModel):
    """Schema per rimuovere ordine da carico"""
    ordine_id: int = Field(..., description="ID ordine da rimuovere")


class MoveOrdineToCarico(BaseModel):
    """Schema per spostare ordine tra carichi"""
    ordine_id: int = Field(..., description="ID ordine da spostare")
    carico_destinazione_id: int = Field(..., description="ID carico destinazione")


# === Schema per validazione ===

class ValidazioneCaricoResult(BaseModel):
    """Risultato validazione compatibilità ordini per carico"""
    valido: bool
    errori: List[str] = []
    warnings: List[str] = []
    totale_quintali: Decimal = Decimal("0")
    mulino_id: Optional[int] = None
    tipo: Optional[str] = None


# === Schema per suggerimenti ===

class SuggerimentoCarico(BaseModel):
    """Suggerimento automatico per composizione carico"""
    ordini_ids: List[int]
    mulino_id: int
    mulino_nome: str
    tipo: str
    totale_quintali: Decimal
    differenza_da_obiettivo: Decimal  # + se manca, - se eccede
    score: float  # Qualità suggerimento (0-100)
    data_piu_urgente: Optional[date] = None


# Forward reference per evitare import circolari
CaricoConOrdini.model_rebuild()