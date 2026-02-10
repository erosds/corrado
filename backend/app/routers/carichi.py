from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc
from typing import List, Optional
from decimal import Decimal

from app.database import get_db
from app.models.carico import Carico
from app.models.ordine import Ordine, RigaOrdine
from app.models.trasportatore import Trasportatore
from app.models.cliente import Cliente
from app.schemas.carico import CaricoCreate, CaricoUpdate, CaricoRead, CaricoDettaglio, CaricoList

router = APIRouter()

# Costanti
OBIETTIVO_QUINTALI = Decimal("300")
SOGLIA_MINIMA = Decimal("280")


def calcola_totale_quintali_carico(db: Session, carico_id: int) -> Decimal:
    """Calcola il totale quintali di un carico"""
    risultato = db.query(
        func.sum(RigaOrdine.quintali)
    ).join(Ordine).filter(
        Ordine.carico_id == carico_id
    ).scalar()
    return risultato or Decimal("0")


@router.get("/", response_model=List[CaricoList])
def lista_carichi(
    stato: Optional[str] = Query(None, description="Filtra per stato (aperto/ritirato)"),
    tipo_carico: Optional[str] = Query(None, description="Filtra per tipo (pedane/sfuso)"),
    solo_aperti: bool = Query(False, description="Mostra solo carichi aperti"),
    db: Session = Depends(get_db)
):
    """Lista carichi con filtri. I carichi aperti sono evidenziati."""
    query = db.query(Carico)
    
    if stato:
        query = query.filter(Carico.stato == stato)
    elif solo_aperti:
        query = query.filter(Carico.stato == "aperto")
    
    if tipo_carico:
        query = query.filter(Carico.tipo_carico == tipo_carico)
    
    carichi = query.order_by(desc(Carico.creato_il)).all()
    
    risultati = []
    for carico in carichi:
        totale_q = calcola_totale_quintali_carico(db, carico.id)
        num_ordini = db.query(Ordine).filter(Ordine.carico_id == carico.id).count()
        trasportatore = db.query(Trasportatore).filter(
            Trasportatore.id == carico.trasportatore_id
        ).first() if carico.trasportatore_id else None
        
        percentuale = min(Decimal("100"), (totale_q / OBIETTIVO_QUINTALI) * 100) if OBIETTIVO_QUINTALI > 0 else Decimal("0")
        
        risultati.append({
            "id": carico.id,
            "tipo_carico": carico.tipo_carico,
            "stato": carico.stato,
            "data_carico": carico.data_carico,
            "trasportatore_nome": trasportatore.nome if trasportatore else None,
            "totale_quintali": totale_q,
            "percentuale_completamento": round(percentuale, 1),
            "is_completo": totale_q >= SOGLIA_MINIMA,
            "num_ordini": num_ordini
        })
    
    return risultati


@router.get("/aperti", response_model=List[CaricoList])
def lista_carichi_aperti(db: Session = Depends(get_db)):
    """Lista solo carichi aperti - utile per vista rapida da mobile"""
    return lista_carichi(solo_aperti=True, db=db)


@router.get("/{carico_id}", response_model=CaricoDettaglio)
def get_carico(carico_id: int, db: Session = Depends(get_db)):
    """Dettaglio carico con tutti gli ordini inclusi"""
    carico = db.query(Carico).filter(Carico.id == carico_id).first()
    if not carico:
        raise HTTPException(status_code=404, detail="Carico non trovato")
    
    # Ottieni ordini del carico
    ordini = db.query(Ordine).filter(Ordine.carico_id == carico_id).all()
    
    ordini_list = []
    for o in ordini:
        cliente = db.query(Cliente).filter(Cliente.id == o.cliente_id).first()
        totali = db.query(
            func.sum(RigaOrdine.quintali).label("totale_quintali"),
            func.sum(RigaOrdine.prezzo_totale).label("totale_importo")
        ).filter(RigaOrdine.ordine_id == o.id).first()
        
        ordini_list.append({
            "id": o.id,
            "cliente_id": o.cliente_id,
            "cliente_nome": cliente.nome if cliente else None,
            "data_ordine": o.data_ordine,
            "data_ritiro": o.data_ritiro,
            "tipo_ordine": o.tipo_ordine,
            "stato": o.stato,
            "totale_quintali": totali.totale_quintali or Decimal("0"),
            "totale_importo": totali.totale_importo or Decimal("0")
        })
    
    trasportatore = db.query(Trasportatore).filter(
        Trasportatore.id == carico.trasportatore_id
    ).first() if carico.trasportatore_id else None
    
    totale_q = sum(o["totale_quintali"] for o in ordini_list)
    quintali_mancanti = max(Decimal("0"), OBIETTIVO_QUINTALI - totale_q)
    percentuale = min(Decimal("100"), (totale_q / OBIETTIVO_QUINTALI) * 100) if OBIETTIVO_QUINTALI > 0 else Decimal("0")
    
    return {
        "id": carico.id,
        "trasportatore_id": carico.trasportatore_id,
        "trasportatore_nome": trasportatore.nome if trasportatore else None,
        "tipo_carico": carico.tipo_carico,
        "data_carico": carico.data_carico,
        "stato": carico.stato,
        "note": carico.note,
        "creato_il": carico.creato_il,
        "totale_quintali": totale_q,
        "quintali_mancanti": quintali_mancanti,
        "percentuale_completamento": round(percentuale, 1),
        "is_completo": totale_q >= SOGLIA_MINIMA,
        "ordini": ordini_list
    }


@router.post("/", response_model=CaricoRead, status_code=201)
def crea_carico(carico: CaricoCreate, db: Session = Depends(get_db)):
    """
    Crea nuovo carico.
    Può includere ordini esistenti (passando ordini_ids).
    Verifica che gli ordini siano dello stesso tipo (pedane/sfuso).
    """
    # Verifica ordini se specificati
    if carico.ordini_ids:
        ordini = db.query(Ordine).filter(Ordine.id.in_(carico.ordini_ids)).all()
        
        if len(ordini) != len(carico.ordini_ids):
            raise HTTPException(status_code=400, detail="Alcuni ordini non trovati")
        
        # Verifica che siano tutti dello stesso tipo
        tipi = set(o.tipo_ordine for o in ordini)
        if len(tipi) > 1:
            raise HTTPException(
                status_code=400,
                detail="Non è possibile mischiare ordini a pedane e sfuso nello stesso carico"
            )
        
        # Verifica che il tipo carico corrisponda
        if tipi and carico.tipo_carico not in tipi:
            raise HTTPException(
                status_code=400,
                detail=f"Il tipo carico deve essere '{list(tipi)[0]}' come gli ordini"
            )
        
        # Verifica che gli ordini non siano già in altri carichi
        for o in ordini:
            if o.carico_id:
                raise HTTPException(
                    status_code=400,
                    detail=f"L'ordine {o.id} è già assegnato al carico {o.carico_id}"
                )
    
    # Crea carico
    carico_data = carico.model_dump(exclude={"ordini_ids"})
    db_carico = Carico(**carico_data)
    db.add(db_carico)
    db.flush()
    
    # Assegna ordini al carico
    if carico.ordini_ids:
        db.query(Ordine).filter(
            Ordine.id.in_(carico.ordini_ids)
        ).update({"carico_id": db_carico.id}, synchronize_session=False)
    
    db.commit()
    db.refresh(db_carico)
    return db_carico


@router.put("/{carico_id}", response_model=CaricoRead)
def aggiorna_carico(
    carico_id: int,
    carico: CaricoUpdate,
    db: Session = Depends(get_db)
):
    """
    Aggiorna carico.
    Se stato diventa 'ritirato', tutti gli ordini del carico diventano 'ritirato'.
    """
    db_carico = db.query(Carico).filter(Carico.id == carico_id).first()
    if not db_carico:
        raise HTTPException(status_code=404, detail="Carico non trovato")
    
    update_data = carico.model_dump(exclude_unset=True)
    
    # Se stato cambia a 'ritirato', aggiorna tutti gli ordini
    if update_data.get("stato") == "ritirato" and db_carico.stato != "ritirato":
        db.query(Ordine).filter(
            Ordine.carico_id == carico_id
        ).update({"stato": "ritirato"}, synchronize_session=False)
    
    for field, value in update_data.items():
        setattr(db_carico, field, value)
    
    db.commit()
    db.refresh(db_carico)
    return db_carico


@router.post("/{carico_id}/aggiungi-ordine/{ordine_id}", response_model=CaricoDettaglio)
def aggiungi_ordine_a_carico(
    carico_id: int,
    ordine_id: int,
    db: Session = Depends(get_db)
):
    """Aggiunge un ordine esistente a un carico"""
    carico = db.query(Carico).filter(Carico.id == carico_id).first()
    if not carico:
        raise HTTPException(status_code=404, detail="Carico non trovato")
    
    ordine = db.query(Ordine).filter(Ordine.id == ordine_id).first()
    if not ordine:
        raise HTTPException(status_code=404, detail="Ordine non trovato")
    
    if ordine.carico_id:
        raise HTTPException(
            status_code=400,
            detail=f"L'ordine è già assegnato al carico {ordine.carico_id}"
        )
    
    if ordine.tipo_ordine != carico.tipo_carico:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo ordine ({ordine.tipo_ordine}) incompatibile con tipo carico ({carico.tipo_carico})"
        )
    
    ordine.carico_id = carico_id
    db.commit()
    
    return get_carico(carico_id, db)


@router.post("/{carico_id}/rimuovi-ordine/{ordine_id}", response_model=CaricoDettaglio)
def rimuovi_ordine_da_carico(
    carico_id: int,
    ordine_id: int,
    db: Session = Depends(get_db)
):
    """Rimuove un ordine da un carico"""
    carico = db.query(Carico).filter(Carico.id == carico_id).first()
    if not carico:
        raise HTTPException(status_code=404, detail="Carico non trovato")
    
    ordine = db.query(Ordine).filter(Ordine.id == ordine_id).first()
    if not ordine:
        raise HTTPException(status_code=404, detail="Ordine non trovato")
    
    if ordine.carico_id != carico_id:
        raise HTTPException(status_code=400, detail="L'ordine non appartiene a questo carico")
    
    ordine.carico_id = None
    db.commit()
    
    return get_carico(carico_id, db)


@router.delete("/{carico_id}", status_code=204)
def elimina_carico(carico_id: int, db: Session = Depends(get_db)):
    """Elimina carico (gli ordini vengono scollegati, non eliminati)"""
    db_carico = db.query(Carico).filter(Carico.id == carico_id).first()
    if not db_carico:
        raise HTTPException(status_code=404, detail="Carico non trovato")
    
    # Scollega ordini
    db.query(Ordine).filter(
        Ordine.carico_id == carico_id
    ).update({"carico_id": None}, synchronize_session=False)
    
    db.delete(db_carico)
    db.commit()
    return None