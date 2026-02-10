from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from app.database import get_db
from app.models.prodotto import Prodotto
from app.models.mulino import Mulino
from app.schemas.prodotto import ProdottoCreate, ProdottoUpdate, ProdottoRead, ProdottoConMulino

router = APIRouter()


@router.get("/", response_model=List[ProdottoConMulino])
def lista_prodotti(
    search: Optional[str] = Query(None, description="Cerca per nome"),
    mulino_id: Optional[int] = Query(None, description="Filtra per mulino"),
    tipologia: Optional[str] = Query(None, description="Filtra per tipologia (0, 00, altro)"),
    db: Session = Depends(get_db)
):
    """Lista tutti i prodotti con filtri opzionali"""
    query = db.query(
        Prodotto.id,
        Prodotto.nome,
        Prodotto.mulino_id,
        Prodotto.tipologia,
        Prodotto.tipo_provvigione,
        Prodotto.valore_provvigione,
        Prodotto.note,
        Mulino.nome.label("mulino_nome")
    ).join(Mulino)
    
    if search:
        query = query.filter(Prodotto.nome.ilike(f"%{search}%"))
    
    if mulino_id:
        query = query.filter(Prodotto.mulino_id == mulino_id)
    
    if tipologia:
        query = query.filter(Prodotto.tipologia == tipologia)
    
    return query.order_by(Mulino.nome, Prodotto.nome).all()


@router.get("/{prodotto_id}", response_model=ProdottoConMulino)
def get_prodotto(prodotto_id: int, db: Session = Depends(get_db)):
    """Dettaglio singolo prodotto"""
    risultato = db.query(
        Prodotto.id,
        Prodotto.nome,
        Prodotto.mulino_id,
        Prodotto.tipologia,
        Prodotto.tipo_provvigione,
        Prodotto.valore_provvigione,
        Prodotto.note,
        Mulino.nome.label("mulino_nome")
    ).join(Mulino).filter(Prodotto.id == prodotto_id).first()
    
    if not risultato:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")
    return risultato


@router.post("/", response_model=ProdottoRead, status_code=201)
def crea_prodotto(prodotto: ProdottoCreate, db: Session = Depends(get_db)):
    """Crea nuovo prodotto"""
    # Verifica che il mulino esista
    mulino = db.query(Mulino).filter(Mulino.id == prodotto.mulino_id).first()
    if not mulino:
        raise HTTPException(status_code=400, detail="Mulino non trovato")
    
    db_prodotto = Prodotto(**prodotto.model_dump())
    db.add(db_prodotto)
    db.commit()
    db.refresh(db_prodotto)
    return db_prodotto


@router.put("/{prodotto_id}", response_model=ProdottoRead)
def aggiorna_prodotto(
    prodotto_id: int,
    prodotto: ProdottoUpdate,
    db: Session = Depends(get_db)
):
    """Aggiorna prodotto esistente"""
    db_prodotto = db.query(Prodotto).filter(Prodotto.id == prodotto_id).first()
    if not db_prodotto:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")
    
    update_data = prodotto.model_dump(exclude_unset=True)
    
    # Se cambia il mulino, verifica che esista
    if "mulino_id" in update_data:
        mulino = db.query(Mulino).filter(Mulino.id == update_data["mulino_id"]).first()
        if not mulino:
            raise HTTPException(status_code=400, detail="Mulino non trovato")
    
    for field, value in update_data.items():
        setattr(db_prodotto, field, value)
    
    db.commit()
    db.refresh(db_prodotto)
    return db_prodotto


@router.delete("/{prodotto_id}", status_code=204)
def elimina_prodotto(prodotto_id: int, db: Session = Depends(get_db)):
    """Elimina prodotto"""
    db_prodotto = db.query(Prodotto).filter(Prodotto.id == prodotto_id).first()
    if not db_prodotto:
        raise HTTPException(status_code=404, detail="Prodotto non trovato")
    
    db.delete(db_prodotto)
    db.commit()
    return None