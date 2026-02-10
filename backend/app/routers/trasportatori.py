from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.trasportatore import Trasportatore
from app.schemas.trasportatore import TrasportatoreCreate, TrasportatoreUpdate, TrasportatoreRead

router = APIRouter()


@router.get("/", response_model=List[TrasportatoreRead])
def lista_trasportatori(
    search: Optional[str] = Query(None, description="Cerca per nome"),
    db: Session = Depends(get_db)
):
    """Lista tutti i trasportatori"""
    query = db.query(Trasportatore)
    
    if search:
        query = query.filter(Trasportatore.nome.ilike(f"%{search}%"))
    
    return query.order_by(Trasportatore.nome).all()


@router.get("/{trasportatore_id}", response_model=TrasportatoreRead)
def get_trasportatore(trasportatore_id: int, db: Session = Depends(get_db)):
    """Dettaglio singolo trasportatore"""
    trasportatore = db.query(Trasportatore).filter(Trasportatore.id == trasportatore_id).first()
    if not trasportatore:
        raise HTTPException(status_code=404, detail="Trasportatore non trovato")
    return trasportatore


@router.post("/", response_model=TrasportatoreRead, status_code=201)
def crea_trasportatore(trasportatore: TrasportatoreCreate, db: Session = Depends(get_db)):
    """Crea nuovo trasportatore"""
    db_trasportatore = Trasportatore(**trasportatore.model_dump())
    db.add(db_trasportatore)
    db.commit()
    db.refresh(db_trasportatore)
    return db_trasportatore


@router.put("/{trasportatore_id}", response_model=TrasportatoreRead)
def aggiorna_trasportatore(
    trasportatore_id: int,
    trasportatore: TrasportatoreUpdate,
    db: Session = Depends(get_db)
):
    """Aggiorna trasportatore esistente"""
    db_trasportatore = db.query(Trasportatore).filter(Trasportatore.id == trasportatore_id).first()
    if not db_trasportatore:
        raise HTTPException(status_code=404, detail="Trasportatore non trovato")
    
    update_data = trasportatore.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_trasportatore, field, value)
    
    db.commit()
    db.refresh(db_trasportatore)
    return db_trasportatore


@router.delete("/{trasportatore_id}", status_code=204)
def elimina_trasportatore(trasportatore_id: int, db: Session = Depends(get_db)):
    """Elimina trasportatore"""
    db_trasportatore = db.query(Trasportatore).filter(Trasportatore.id == trasportatore_id).first()
    if not db_trasportatore:
        raise HTTPException(status_code=404, detail="Trasportatore non trovato")
    
    db.delete(db_trasportatore)
    db.commit()
    return None