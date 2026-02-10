from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional

from app.database import get_db
from app.models.cliente import Cliente
from app.models.storico_prezzo import StoricoPrezzo
from app.models.prodotto import Prodotto
from app.models.mulino import Mulino
from app.schemas.cliente import ClienteCreate, ClienteUpdate, ClienteRead, ClienteList
from app.schemas.storico_prezzo import UltimoPrezzoRead

router = APIRouter()


@router.get("/", response_model=List[ClienteList])
def lista_clienti(
    search: Optional[str] = Query(None, description="Cerca per nome"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Lista tutti i clienti con ricerca opzionale"""
    query = db.query(Cliente)
    
    if search:
        query = query.filter(
            or_(
                Cliente.nome.ilike(f"%{search}%"),
                Cliente.referente.ilike(f"%{search}%")
            )
        )
    
    return query.order_by(Cliente.nome).offset(skip).limit(limit).all()


@router.get("/{cliente_id}", response_model=ClienteRead)
def get_cliente(cliente_id: int, db: Session = Depends(get_db)):
    """Dettaglio singolo cliente"""
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    return cliente


@router.post("/", response_model=ClienteRead, status_code=201)
def crea_cliente(cliente: ClienteCreate, db: Session = Depends(get_db)):
    """Crea nuovo cliente"""
    db_cliente = Cliente(**cliente.model_dump())
    db.add(db_cliente)
    db.commit()
    db.refresh(db_cliente)
    return db_cliente


@router.put("/{cliente_id}", response_model=ClienteRead)
def aggiorna_cliente(
    cliente_id: int,
    cliente: ClienteUpdate,
    db: Session = Depends(get_db)
):
    """Aggiorna cliente esistente"""
    db_cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not db_cliente:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    update_data = cliente.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_cliente, field, value)
    
    db.commit()
    db.refresh(db_cliente)
    return db_cliente


@router.delete("/{cliente_id}", status_code=204)
def elimina_cliente(cliente_id: int, db: Session = Depends(get_db)):
    """Elimina cliente"""
    db_cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not db_cliente:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    db.delete(db_cliente)
    db.commit()
    return None


@router.get("/{cliente_id}/prezzi", response_model=List[UltimoPrezzoRead])
def get_prezzi_cliente(cliente_id: int, db: Session = Depends(get_db)):
    """
    Ottiene gli ultimi prezzi per ogni prodotto ordinato dal cliente.
    Utile per consultazione rapida da telefono.
    Ordinati per mulino e frequenza d'ordine.
    """
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    # Subquery per ottenere l'ultimo prezzo per ogni prodotto
    from sqlalchemy import func, desc
    
    subq = db.query(
        StoricoPrezzo.prodotto_id,
        func.max(StoricoPrezzo.creato_il).label("max_data")
    ).filter(
        StoricoPrezzo.cliente_id == cliente_id
    ).group_by(StoricoPrezzo.prodotto_id).subquery()
    
    risultati = db.query(
        StoricoPrezzo.cliente_id,
        StoricoPrezzo.prodotto_id,
        Prodotto.nome.label("prodotto_nome"),
        Prodotto.mulino_id,
        Mulino.nome.label("mulino_nome"),
        StoricoPrezzo.prezzo.label("ultimo_prezzo"),
        StoricoPrezzo.creato_il.label("data_ultimo_ordine")
    ).join(
        subq,
        (StoricoPrezzo.prodotto_id == subq.c.prodotto_id) &
        (StoricoPrezzo.creato_il == subq.c.max_data)
    ).join(
        Prodotto, StoricoPrezzo.prodotto_id == Prodotto.id
    ).join(
        Mulino, Prodotto.mulino_id == Mulino.id
    ).filter(
        StoricoPrezzo.cliente_id == cliente_id
    ).order_by(
        Mulino.nome, Prodotto.nome
    ).all()
    
    return risultati