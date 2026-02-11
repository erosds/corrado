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
from app.schemas.carico import CaricoCreate, CaricoUpdate, CaricoRead, CaricoList

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
    return lista_carichi(stato=None, tipo_carico=None, solo_aperti=True, db=db)

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