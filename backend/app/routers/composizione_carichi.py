"""
Router per la composizione intelligente dei carichi.
Fornisce endpoint per:
- Ordini non assegnati raggruppati per mulino e tipo
- Suggerimenti automatici di combinazioni ottimali
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from decimal import Decimal
from datetime import date, timedelta
from pydantic import BaseModel

from app.database import get_db
from app.models.ordine import Ordine, RigaOrdine
from app.models.cliente import Cliente
from app.models.mulino import Mulino
from app.models.carico import Carico

router = APIRouter()

# Costanti
OBIETTIVO_QUINTALI = Decimal("300")
SOGLIA_MINIMA = Decimal("280")
SOGLIA_MASSIMA = Decimal("320")
GIORNI_TOLLERANZA_DATA = 3  # Per suggerimenti: ordini entro X giorni


# === SCHEMAS ===

class OrdineNonAssegnato(BaseModel):
    """Ordine singolo non ancora assegnato a un carico"""
    id: int
    cliente_id: int
    cliente_nome: str
    data_ordine: date
    data_ritiro: Optional[date]
    tipo_ordine: str  # "pedane" o "sfuso"
    stato: str
    totale_quintali: Decimal
    mulino_id: int
    mulino_nome: str
    
    class Config:
        from_attributes = True


class GruppoMulino(BaseModel):
    """Ordini raggruppati per mulino e tipo"""
    mulino_id: int
    mulino_nome: str
    tipo: str  # "pedane" o "sfuso"
    totale_quintali: Decimal
    num_ordini: int
    ordini: List[OrdineNonAssegnato]


class SuggerimentoCombinazione(BaseModel):
    """Suggerimento di combinazione ottimale"""
    ordini_ids: List[int]
    totale_quintali: Decimal
    differenza_da_obiettivo: Decimal  # Quanto manca/eccede da 300
    data_piu_urgente: Optional[date]
    score: float  # Punteggio qualità combinazione (più alto = migliore)


class RispostaComposizione(BaseModel):
    """Risposta completa per la pagina composizione"""
    gruppi: List[GruppoMulino]
    suggerimenti: List[SuggerimentoCombinazione]
    carichi_aperti: List[dict]  # Carichi esistenti ancora aperti


# === HELPERS ===

def calcola_totale_quintali_ordine(db: Session, ordine_id: int) -> Decimal:
    """Calcola il totale quintali di un ordine dalle sue righe"""
    result = db.query(
        func.sum(RigaOrdine.quintali)
    ).filter(RigaOrdine.ordine_id == ordine_id).scalar()
    return result or Decimal("0")


def get_mulino_principale_ordine(db: Session, ordine_id: int) -> tuple:
    """
    Restituisce (mulino_id, mulino_nome) del mulino con più quintali nell'ordine.
    Un ordine può avere righe da più mulini, prendiamo quello predominante.
    """
    result = db.query(
        RigaOrdine.mulino_id,
        Mulino.nome,
        func.sum(RigaOrdine.quintali).label("tot")
    ).join(Mulino).filter(
        RigaOrdine.ordine_id == ordine_id
    ).group_by(
        RigaOrdine.mulino_id, Mulino.nome
    ).order_by(
        func.sum(RigaOrdine.quintali).desc()
    ).first()
    
    if result:
        return result.mulino_id, result.nome
    return None, None


def genera_suggerimenti(ordini: List[dict], max_suggerimenti: int = 5) -> List[SuggerimentoCombinazione]:
    """
    Genera suggerimenti di combinazioni ottimali.
    Usa un algoritmo greedy per trovare combinazioni che si avvicinano a 280-300 q.li
    """
    if not ordini:
        return []
    
    suggerimenti = []
    ordini_disponibili = sorted(ordini, key=lambda x: x["data_ritiro"] or date.max)
    
    # Strategia 1: Trova coppie che sommano vicino a 300
    for i, o1 in enumerate(ordini_disponibili):
        for o2 in ordini_disponibili[i+1:]:
            totale = o1["totale_quintali"] + o2["totale_quintali"]
            
            # Accetta combinazioni tra 280 e 320
            if SOGLIA_MINIMA <= totale <= SOGLIA_MASSIMA:
                diff = abs(totale - OBIETTIVO_QUINTALI)
                
                # Calcola score: più vicino a 300 e date vicine = score più alto
                date1 = o1["data_ritiro"] or o1["data_ordine"]
                date2 = o2["data_ritiro"] or o2["data_ordine"]
                giorni_diff = abs((date1 - date2).days) if date1 and date2 else 0
                
                # Score: penalizza distanza da 300 e giorni tra date
                score = 100 - float(diff) - (giorni_diff * 2)
                
                suggerimenti.append(SuggerimentoCombinazione(
                    ordini_ids=[o1["id"], o2["id"]],
                    totale_quintali=totale,
                    differenza_da_obiettivo=OBIETTIVO_QUINTALI - totale,
                    data_piu_urgente=min(filter(None, [date1, date2]), default=None),
                    score=score
                ))
    
    # Strategia 2: Trova triple se necessario
    for i, o1 in enumerate(ordini_disponibili):
        for j, o2 in enumerate(ordini_disponibili[i+1:], i+1):
            for o3 in ordini_disponibili[j+1:]:
                totale = o1["totale_quintali"] + o2["totale_quintali"] + o3["totale_quintali"]
                
                if SOGLIA_MINIMA <= totale <= SOGLIA_MASSIMA:
                    diff = abs(totale - OBIETTIVO_QUINTALI)
                    dates = [o["data_ritiro"] or o["data_ordine"] for o in [o1, o2, o3]]
                    valid_dates = [d for d in dates if d]
                    
                    score = 100 - float(diff) - 5  # Penalità per triple
                    
                    suggerimenti.append(SuggerimentoCombinazione(
                        ordini_ids=[o1["id"], o2["id"], o3["id"]],
                        totale_quintali=totale,
                        differenza_da_obiettivo=OBIETTIVO_QUINTALI - totale,
                        data_piu_urgente=min(valid_dates) if valid_dates else None,
                        score=score
                    ))
    
    # Ordina per score e restituisci i migliori
    suggerimenti.sort(key=lambda x: x.score, reverse=True)
    return suggerimenti[:max_suggerimenti]


# === ENDPOINTS ===

@router.get("/ordini-disponibili", response_model=RispostaComposizione)
def get_ordini_disponibili(
    mulino_id: Optional[int] = Query(None, description="Filtra per mulino specifico"),
    tipo: Optional[str] = Query(None, description="Filtra per tipo (pedane/sfuso)"),
    db: Session = Depends(get_db)
):
    """
    Restituisce tutti gli ordini non ancora assegnati a un carico,
    raggruppati per mulino e tipo, con suggerimenti di combinazione.
    """
    
    # Query ordini non assegnati (carico_id IS NULL) e non ancora ritirati
    query = db.query(Ordine).filter(
        Ordine.carico_id.is_(None),
        Ordine.stato == "inserito"
    )
    
    if tipo:
        query = query.filter(Ordine.tipo_ordine == tipo)
    
    ordini_db = query.all()
    
    # Costruisci lista ordini con info complete
    ordini_completi = []
    for ordine in ordini_db:
        cliente = db.query(Cliente).filter(Cliente.id == ordine.cliente_id).first()
        totale_q = calcola_totale_quintali_ordine(db, ordine.id)
        mulino_id_ord, mulino_nome = get_mulino_principale_ordine(db, ordine.id)
        
        if not mulino_id_ord:
            continue  # Salta ordini senza righe
        
        # Applica filtro mulino se specificato
        if mulino_id and mulino_id_ord != mulino_id:
            continue
            
        ordini_completi.append({
            "id": ordine.id,
            "cliente_id": ordine.cliente_id,
            "cliente_nome": cliente.nome if cliente else "N/D",
            "data_ordine": ordine.data_ordine,
            "data_ritiro": ordine.data_ritiro,
            "tipo_ordine": ordine.tipo_ordine,
            "stato": ordine.stato,
            "totale_quintali": totale_q,
            "mulino_id": mulino_id_ord,
            "mulino_nome": mulino_nome
        })
    
    # Raggruppa per mulino e tipo
    gruppi_dict = {}
    for ordine in ordini_completi:
        key = (ordine["mulino_id"], ordine["mulino_nome"], ordine["tipo_ordine"])
        if key not in gruppi_dict:
            gruppi_dict[key] = {
                "mulino_id": ordine["mulino_id"],
                "mulino_nome": ordine["mulino_nome"],
                "tipo": ordine["tipo_ordine"],
                "totale_quintali": Decimal("0"),
                "num_ordini": 0,
                "ordini": []
            }
        gruppi_dict[key]["ordini"].append(OrdineNonAssegnato(**ordine))
        gruppi_dict[key]["totale_quintali"] += ordine["totale_quintali"]
        gruppi_dict[key]["num_ordini"] += 1
    
    gruppi = list(gruppi_dict.values())
    
    # Genera suggerimenti per ogni gruppo (stesso mulino + tipo)
    tutti_suggerimenti = []
    for gruppo in gruppi:
        ordini_gruppo = [
            {
                "id": o.id,
                "totale_quintali": o.totale_quintali,
                "data_ordine": o.data_ordine,
                "data_ritiro": o.data_ritiro
            }
            for o in gruppo["ordini"]
        ]
        suggerimenti_gruppo = genera_suggerimenti(ordini_gruppo)
        tutti_suggerimenti.extend(suggerimenti_gruppo)
    
    # Ordina suggerimenti globalmente per score
    tutti_suggerimenti.sort(key=lambda x: x.score, reverse=True)
    
    # Ottieni carichi aperti esistenti
    carichi_aperti_db = db.query(Carico).filter(Carico.stato == "aperto").all()
    carichi_aperti = []
    for carico in carichi_aperti_db:
        ordini_carico = db.query(Ordine).filter(Ordine.carico_id == carico.id).all()
        totale_q = sum(calcola_totale_quintali_ordine(db, o.id) for o in ordini_carico)
        
        # Trova mulino predominante del carico
        mulino_nome = None
        if ordini_carico:
            _, mulino_nome = get_mulino_principale_ordine(db, ordini_carico[0].id)
        
        carichi_aperti.append({
            "id": carico.id,
            "tipo_carico": carico.tipo_carico,
            "totale_quintali": float(totale_q),
            "percentuale": float(min(100, (totale_q / OBIETTIVO_QUINTALI) * 100)),
            "quintali_mancanti": float(max(0, OBIETTIVO_QUINTALI - totale_q)),
            "is_completo": totale_q >= SOGLIA_MINIMA,
            "num_ordini": len(ordini_carico),
            "mulino_nome": mulino_nome,
            "data_carico": carico.data_carico.isoformat() if carico.data_carico else None
        })
    
    return RispostaComposizione(
        gruppi=gruppi,
        suggerimenti=tutti_suggerimenti[:10],  # Max 10 suggerimenti
        carichi_aperti=carichi_aperti
    )


@router.get("/mulini-con-ordini")
def get_mulini_con_ordini(db: Session = Depends(get_db)):
    """
    Restituisce lista dei mulini che hanno ordini non assegnati.
    Utile per il filtro nella UI.
    """
    # Trova tutti i mulini_id dalle righe di ordini non assegnati
    subquery = db.query(Ordine.id).filter(
        Ordine.carico_id.is_(None),
        Ordine.stato == "inserito"
    ).subquery()
    
    mulini_ids = db.query(RigaOrdine.mulino_id).filter(
        RigaOrdine.ordine_id.in_(subquery)
    ).distinct().all()
    
    mulini_ids = [m[0] for m in mulini_ids]
    
    if not mulini_ids:
        return []
    
    mulini = db.query(Mulino).filter(Mulino.id.in_(mulini_ids)).all()
    
    return [{"id": m.id, "nome": m.nome} for m in mulini]