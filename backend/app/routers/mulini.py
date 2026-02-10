from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.mulino import Mulino
from app.models.prodotto import Prodotto
from app.schemas.mulino import MulinoCreate, MulinoUpdate, MulinoRead
from app.schemas.prodotto import ProdottoRead

router = APIRouter()


@router.get("/", response_model=List[MulinoRead])
def lista_mulini(
    search: Optional[str] = Query(None, description="Cerca per nome"),
    db: Session = Depends(get_db)
):
    """Lista tutti i mulini"""
    query = db.query(Mulino)
    
    if search:
        query = query.filter(Mulino.nome.ilike(f"%{search}%"))
    
    return query.order_by(Mulino.nome).all()


@router.get("/{mulino_id}", response_model=MulinoRead)
def get_mulino(mulino_id: int, db: Session = Depends(get_db)):
    """Dettaglio singolo mulino"""
    mulino = db.query(Mulino).filter(Mulino.id == mulino_id).first()
    if not mulino:
        raise HTTPException(status_code=404, detail="Mulino non trovato")
    return mulino


@router.get("/{mulino_id}/prodotti", response_model=List[ProdottoRead])
def get_prodotti_mulino(mulino_id: int, db: Session = Depends(get_db)):
    """Lista prodotti di un mulino specifico"""
    mulino = db.query(Mulino).filter(Mulino.id == mulino_id).first()
    if not mulino:
        raise HTTPException(status_code=404, detail="Mulino non trovato")
    
    prodotti = db.query(Prodotto).filter(
        Prodotto.mulino_id == mulino_id
    ).order_by(Prodotto.nome).all()
    
    return prodotti


@router.post("/", response_model=MulinoRead, status_code=201)
def crea_mulino(mulino: MulinoCreate, db: Session = Depends(get_db)):
    """Crea nuovo mulino"""
    db_mulino = Mulino(**mulino.model_dump())
    db.add(db_mulino)
    db.commit()
    db.refresh(db_mulino)
    return db_mulino


@router.put("/{mulino_id}", response_model=MulinoRead)
def aggiorna_mulino(
    mulino_id: int,
    mulino: MulinoUpdate,
    db: Session = Depends(get_db)
):
    """Aggiorna mulino esistente"""
    db_mulino = db.query(Mulino).filter(Mulino.id == mulino_id).first()
    if not db_mulino:
        raise HTTPException(status_code=404, detail="Mulino non trovato")
    
    update_data = mulino.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_mulino, field, value)
    
    db.commit()
    db.refresh(db_mulino)
    return db_mulino


@router.delete("/{mulino_id}", status_code=204)
def elimina_mulino(mulino_id: int, db: Session = Depends(get_db)):
    """Elimina mulino"""
    db_mulino = db.query(Mulino).filter(Mulino.id == mulino_id).first()
    if not db_mulino:
        raise HTTPException(status_code=404, detail="Mulino non trovato")
    
    # Verifica che non ci siano prodotti associati
    prodotti_count = db.query(Prodotto).filter(Prodotto.mulino_id == mulino_id).count()
    if prodotti_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Impossibile eliminare: ci sono {prodotti_count} prodotti associati"
        )
    
    db.delete(db_mulino)
    db.commit()
    return None