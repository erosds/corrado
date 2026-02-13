from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from datetime import date
from decimal import Decimal
from pydantic import BaseModel

from app.database import get_db
from app.models.ordine import Ordine, RigaOrdine
from app.models.cliente import Cliente
from app.models.prodotto import Prodotto
from app.models.mulino import Mulino

router = APIRouter()


# --- Schemas per le risposte ---

class ProvvigioneMulino(BaseModel):
    mulino_id: int
    mulino_nome: str
    totale_quintali: Decimal
    totale_incassato: Decimal
    totale_provvigione: Decimal
    num_ordini: int


class ProvvigioneDettaglio(BaseModel):
    ordine_id: int
    cliente_nome: str
    data_ordine: date
    data_incasso: Optional[date]
    prodotto_nome: str
    quintali: Decimal
    prezzo_quintale: Decimal
    importo_riga: Decimal
    tipo_provvigione: str
    valore_provvigione: Decimal
    provvigione_calcolata: Decimal


class RigaProvvigione(BaseModel):
    id: int
    pedane: Optional[Decimal] = None
    prodotto_nome: str
    prodotto_tipologia: Optional[str] = None
    quintali: Decimal
    prezzo_quintale: Decimal
    prezzo_totale: Decimal
    tipo_provvigione: str
    valore_provvigione: Decimal
    provvigione_calcolata: Decimal


class OrdineProvvigione(BaseModel):
    id: int
    cliente_nome: str
    data_ordine: date
    data_ritiro: Optional[date] = None
    data_incasso_mulino: Optional[date] = None
    tipo_ordine: str
    totale_quintali: Decimal
    totale_importo: Decimal
    totale_provvigione: Decimal
    righe: List[RigaProvvigione]


class ProvvigioniOrdiniResponse(BaseModel):
    totale_provvigioni: Decimal
    totale_incassato: Decimal
    totale_quintali: Decimal
    ordini: List[OrdineProvvigione]


class VendutoCliente(BaseModel):
    cliente_id: int
    cliente_nome: str
    totale_quintali: Decimal
    totale_importo: Decimal
    num_ordini: int


class VendutoProdotto(BaseModel):
    prodotto_id: int
    prodotto_nome: str
    mulino_nome: str
    totale_quintali: Decimal
    totale_importo: Decimal
    num_ordini: int


class RiepilogoTrimestre(BaseModel):
    trimestre: int
    anno: int
    data_inizio: date
    data_fine: date
    totale_quintali: Decimal
    totale_incassato: Decimal
    totale_provvigioni: Decimal
    provvigioni_per_mulino: List[ProvvigioneMulino]


# --- Funzioni helper ---

def get_trimestre_date(anno: int, trimestre: int):
    """Restituisce data inizio e fine del trimestre"""
    mese_inizio = (trimestre - 1) * 3 + 1
    data_inizio = date(anno, mese_inizio, 1)
    
    if trimestre == 4:
        data_fine = date(anno, 12, 31)
    else:
        mese_fine = trimestre * 3
        if mese_fine in [1, 3, 5, 7, 8, 10, 12]:
            giorno_fine = 31
        elif mese_fine in [4, 6, 9, 11]:
            giorno_fine = 30
        else:
            giorno_fine = 28 if anno % 4 != 0 else 29
        data_fine = date(anno, mese_fine, giorno_fine)
    
    return data_inizio, data_fine


def calcola_provvigione_riga(riga: RigaOrdine, prodotto: Prodotto) -> Decimal:
    """Calcola la provvigione per una singola riga ordine"""
    if prodotto.tipo_provvigione == "percentuale":
        return riga.quintali * riga.prezzo_quintale * (prodotto.valore_provvigione / 100)
    elif prodotto.tipo_provvigione == "fisso":
        return riga.quintali * prodotto.valore_provvigione
    return Decimal("0")


# --- Endpoints ---

@router.get("/provvigioni/trimestre", response_model=RiepilogoTrimestre)
def provvigioni_trimestre(
    anno: int = Query(..., description="Anno"),
    trimestre: int = Query(..., ge=1, le=4, description="Trimestre (1-4)"),
    db: Session = Depends(get_db)
):
    """
    Calcola le provvigioni per un trimestre.
    Le provvigioni sono calcolate sugli incassi del mulino (data_incasso_mulino).
    """
    data_inizio, data_fine = get_trimestre_date(anno, trimestre)
    
    ordini = db.query(Ordine).filter(
        Ordine.data_incasso_mulino >= data_inizio,
        Ordine.data_incasso_mulino <= data_fine
    ).all()
    
    mulini_stats = {}
    totale_quintali = Decimal("0")
    totale_incassato = Decimal("0")
    totale_provvigioni = Decimal("0")
    
    for ordine in ordini:
        righe = db.query(RigaOrdine).filter(RigaOrdine.ordine_id == ordine.id).all()
        
        for riga in righe:
            prodotto = db.query(Prodotto).filter(Prodotto.id == riga.prodotto_id).first()
            mulino = db.query(Mulino).filter(Mulino.id == riga.mulino_id).first()
            
            if not mulino or not prodotto:
                continue
            
            provvigione = calcola_provvigione_riga(riga, prodotto)
            
            if mulino.id not in mulini_stats:
                mulini_stats[mulino.id] = {
                    "mulino_id": mulino.id,
                    "mulino_nome": mulino.nome,
                    "totale_quintali": Decimal("0"),
                    "totale_incassato": Decimal("0"),
                    "totale_provvigione": Decimal("0"),
                    "ordini_ids": set()
                }
            
            mulini_stats[mulino.id]["totale_quintali"] += riga.quintali
            mulini_stats[mulino.id]["totale_incassato"] += riga.prezzo_totale
            mulini_stats[mulino.id]["totale_provvigione"] += provvigione
            mulini_stats[mulino.id]["ordini_ids"].add(ordine.id)
            
            totale_quintali += riga.quintali
            totale_incassato += riga.prezzo_totale
            totale_provvigioni += provvigione
    
    provvigioni_per_mulino = [
        ProvvigioneMulino(
            mulino_id=m["mulino_id"],
            mulino_nome=m["mulino_nome"],
            totale_quintali=m["totale_quintali"],
            totale_incassato=m["totale_incassato"],
            totale_provvigione=m["totale_provvigione"],
            num_ordini=len(m["ordini_ids"])
        )
        for m in mulini_stats.values()
    ]
    
    return RiepilogoTrimestre(
        trimestre=trimestre,
        anno=anno,
        data_inizio=data_inizio,
        data_fine=data_fine,
        totale_quintali=totale_quintali,
        totale_incassato=totale_incassato,
        totale_provvigioni=totale_provvigioni,
        provvigioni_per_mulino=sorted(provvigioni_per_mulino, key=lambda x: x.mulino_nome)
    )


@router.get("/provvigioni/ordini", response_model=ProvvigioniOrdiniResponse)
def provvigioni_ordini(
    anno: int = Query(...),
    trimestre: int = Query(..., ge=1, le=4),
    mulino_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Lista ordini del trimestre con provvigioni calcolate per ogni riga.
    Filtra opzionalmente per mulino.
    """
    data_inizio, data_fine = get_trimestre_date(anno, trimestre)

    ordini_query = db.query(Ordine).filter(
        Ordine.data_incasso_mulino >= data_inizio,
        Ordine.data_incasso_mulino <= data_fine
    )

    if mulino_id:
        ordini_query = ordini_query.filter(
            Ordine.righe.any(RigaOrdine.mulino_id == mulino_id)
        )

    ordini = ordini_query.all()

    totale_provvigioni = Decimal("0")
    totale_incassato = Decimal("0")
    totale_quintali = Decimal("0")
    ordini_result = []

    for ordine in ordini:
        cliente = db.query(Cliente).filter(Cliente.id == ordine.cliente_id).first()
        righe_result = []
        ordine_provvigione = Decimal("0")
        ordine_quintali = Decimal("0")
        ordine_importo = Decimal("0")

        righe = db.query(RigaOrdine).filter(RigaOrdine.ordine_id == ordine.id)
        if mulino_id:
            righe = righe.filter(RigaOrdine.mulino_id == mulino_id)
        righe = righe.all()

        for riga in righe:
            prodotto = db.query(Prodotto).filter(Prodotto.id == riga.prodotto_id).first()
            if not prodotto:
                continue

            provvigione = calcola_provvigione_riga(riga, prodotto)

            righe_result.append(RigaProvvigione(
                id=riga.id,
                pedane=riga.pedane,
                prodotto_nome=prodotto.nome,
                prodotto_tipologia=prodotto.tipologia,
                quintali=riga.quintali,
                prezzo_quintale=riga.prezzo_quintale,
                prezzo_totale=riga.prezzo_totale,
                tipo_provvigione=prodotto.tipo_provvigione,
                valore_provvigione=prodotto.valore_provvigione,
                provvigione_calcolata=provvigione
            ))

            ordine_provvigione += provvigione
            ordine_quintali += riga.quintali
            ordine_importo += riga.prezzo_totale

        ordini_result.append(OrdineProvvigione(
            id=ordine.id,
            cliente_nome=cliente.nome if cliente else "?",
            data_ordine=ordine.data_ordine,
            data_ritiro=ordine.data_ritiro,
            data_incasso_mulino=ordine.data_incasso_mulino,
            tipo_ordine=ordine.tipo_ordine,
            totale_quintali=ordine_quintali,
            totale_importo=ordine_importo,
            totale_provvigione=ordine_provvigione,
            righe=righe_result
        ))

        totale_provvigioni += ordine_provvigione
        totale_incassato += ordine_importo
        totale_quintali += ordine_quintali

    ordini_result.sort(key=lambda x: x.data_ordine, reverse=True)

    return ProvvigioniOrdiniResponse(
        totale_provvigioni=totale_provvigioni,
        totale_incassato=totale_incassato,
        totale_quintali=totale_quintali,
        ordini=ordini_result
    )


@router.get("/provvigioni/dettaglio-mulino/{mulino_id}", response_model=List[ProvvigioneDettaglio])
def provvigioni_dettaglio_mulino(
    mulino_id: int,
    anno: int = Query(...),
    trimestre: int = Query(..., ge=1, le=4),
    db: Session = Depends(get_db)
):
    """Dettaglio provvigioni per un mulino specifico nel trimestre"""
    data_inizio, data_fine = get_trimestre_date(anno, trimestre)
    
    risultati = []
    
    righe = db.query(RigaOrdine).join(Ordine).filter(
        RigaOrdine.mulino_id == mulino_id,
        Ordine.data_incasso_mulino >= data_inizio,
        Ordine.data_incasso_mulino <= data_fine
    ).all()
    
    for riga in righe:
        ordine = db.query(Ordine).filter(Ordine.id == riga.ordine_id).first()
        cliente = db.query(Cliente).filter(Cliente.id == ordine.cliente_id).first()
        prodotto = db.query(Prodotto).filter(Prodotto.id == riga.prodotto_id).first()
        
        provvigione = calcola_provvigione_riga(riga, prodotto)
        
        risultati.append(ProvvigioneDettaglio(
            ordine_id=ordine.id,
            cliente_nome=cliente.nome,
            data_ordine=ordine.data_ordine,
            data_incasso=ordine.data_incasso_mulino,
            prodotto_nome=prodotto.nome,
            quintali=riga.quintali,
            prezzo_quintale=riga.prezzo_quintale,
            importo_riga=riga.prezzo_totale,
            tipo_provvigione=prodotto.tipo_provvigione,
            valore_provvigione=prodotto.valore_provvigione,
            provvigione_calcolata=provvigione
        ))
    
    return sorted(risultati, key=lambda x: x.data_incasso or x.data_ordine)


@router.get("/incassato-mulino/{mulino_id}")
def incassato_per_mulino(
    mulino_id: int,
    data_da: Optional[date] = Query(None),
    data_a: Optional[date] = Query(None),
    anno: Optional[int] = Query(None),
    trimestre: Optional[int] = Query(None, ge=1, le=4),
    db: Session = Depends(get_db)
):
    """
    Recap incassato per un mulino in un periodo.
    Puo filtrare per date esatte o per anno/trimestre.
    """
    mulino = db.query(Mulino).filter(Mulino.id == mulino_id).first()
    if not mulino:
        return {"errore": "Mulino non trovato"}
    
    if anno and trimestre:
        data_da, data_a = get_trimestre_date(anno, trimestre)
    
    query = db.query(
        func.sum(RigaOrdine.quintali).label("totale_quintali"),
        func.sum(RigaOrdine.prezzo_totale).label("totale_incassato"),
        func.count(func.distinct(Ordine.id)).label("num_ordini")
    ).join(Ordine).filter(
        RigaOrdine.mulino_id == mulino_id
    )
    
    if data_da:
        query = query.filter(Ordine.data_incasso_mulino >= data_da)
    if data_a:
        query = query.filter(Ordine.data_incasso_mulino <= data_a)
    
    risultato = query.first()
    
    return {
        "mulino_id": mulino_id,
        "mulino_nome": mulino.nome,
        "periodo": {
            "data_da": data_da,
            "data_a": data_a,
            "anno": anno,
            "trimestre": trimestre
        },
        "totale_quintali": risultato.totale_quintali or Decimal("0"),
        "totale_incassato": risultato.totale_incassato or Decimal("0"),
        "num_ordini": risultato.num_ordini or 0
    }


@router.get("/venduto-per-cliente", response_model=List[VendutoCliente])
def venduto_per_cliente(
    data_da: Optional[date] = Query(None),
    data_a: Optional[date] = Query(None),
    limit: int = Query(50),
    db: Session = Depends(get_db)
):
    """Classifica clienti per volume venduto"""
    query = db.query(
        Cliente.id.label("cliente_id"),
        Cliente.nome.label("cliente_nome"),
        func.sum(RigaOrdine.quintali).label("totale_quintali"),
        func.sum(RigaOrdine.prezzo_totale).label("totale_importo"),
        func.count(func.distinct(Ordine.id)).label("num_ordini")
    ).join(Ordine, Cliente.id == Ordine.cliente_id
    ).join(RigaOrdine, Ordine.id == RigaOrdine.ordine_id)
    
    if data_da:
        query = query.filter(Ordine.data_ordine >= data_da)
    if data_a:
        query = query.filter(Ordine.data_ordine <= data_a)
    
    risultati = query.group_by(
        Cliente.id, Cliente.nome
    ).order_by(
        func.sum(RigaOrdine.prezzo_totale).desc()
    ).limit(limit).all()
    
    return risultati


@router.get("/venduto-per-prodotto", response_model=List[VendutoProdotto])
def venduto_per_prodotto(
    data_da: Optional[date] = Query(None),
    data_a: Optional[date] = Query(None),
    mulino_id: Optional[int] = Query(None),
    limit: int = Query(50),
    db: Session = Depends(get_db)
):
    """Classifica prodotti per volume venduto"""
    query = db.query(
        Prodotto.id.label("prodotto_id"),
        Prodotto.nome.label("prodotto_nome"),
        Mulino.nome.label("mulino_nome"),
        func.sum(RigaOrdine.quintali).label("totale_quintali"),
        func.sum(RigaOrdine.prezzo_totale).label("totale_importo"),
        func.count(func.distinct(Ordine.id)).label("num_ordini")
    ).join(RigaOrdine, Prodotto.id == RigaOrdine.prodotto_id
    ).join(Ordine, RigaOrdine.ordine_id == Ordine.id
    ).join(Mulino, Prodotto.mulino_id == Mulino.id)
    
    if data_da:
        query = query.filter(Ordine.data_ordine >= data_da)
    if data_a:
        query = query.filter(Ordine.data_ordine <= data_a)
    if mulino_id:
        query = query.filter(Prodotto.mulino_id == mulino_id)
    
    risultati = query.group_by(
        Prodotto.id, Prodotto.nome, Mulino.nome
    ).order_by(
        func.sum(RigaOrdine.quintali).desc()
    ).limit(limit).all()
    
    return risultati