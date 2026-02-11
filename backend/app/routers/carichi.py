"""
Router API per Carichi

Endpoint per gestione completa carichi:
- CRUD carichi
- Gestione ordini nel carico
- Transizioni di stato
- Validazione e suggerimenti
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from decimal import Decimal
from datetime import date

from app.database import get_db
from app.models.carico import Carico, StatoCarico
from app.models.ordine import Ordine, StatoLogisticoOrdine
from app.models.mulino import Mulino
from app.models.trasportatore import Trasportatore

from app.schemas.carico import (
    CaricoCreate,
    CaricoCreateDraft,
    CaricoUpdate,
    CaricoRead,
    CaricoList,
    CaricoConOrdini,
    CaricoAssignTransport,
    AddOrdineToCarico,
    RemoveOrdineFromCarico,
    ValidazioneCaricoResult,
    OrdineInCarico
)

from app.services import carico_service

router = APIRouter()


# === HELPERS ===

def _build_carico_read(db: Session, carico: Carico) -> dict:
    """Costruisce la response per un carico con tutti i campi calcolati"""
    mulino = db.query(Mulino).filter(Mulino.id == carico.mulino_id).first()
    trasportatore = None
    if carico.trasportatore_id:
        trasportatore = db.query(Trasportatore).filter(
            Trasportatore.id == carico.trasportatore_id
        ).first()
    
    num_ordini = db.query(Ordine).filter(Ordine.carico_id == carico.id).count()
    
    return {
        "id": carico.id,
        "mulino_id": carico.mulino_id,
        "mulino_nome": mulino.nome if mulino else None,
        "tipo": carico.tipo,
        "trasportatore_id": carico.trasportatore_id,
        "trasportatore_nome": trasportatore.nome if trasportatore else None,
        "data_ritiro": carico.data_ritiro,
        "stato": carico.stato,
        "total_quantita": carico.total_quantita or Decimal("0"),
        "note": carico.note,
        "creato_il": carico.creato_il,
        "aggiornato_il": carico.aggiornato_il,
        "num_ordini": num_ordini,
        "quintali_disponibili": Decimal("300") - (carico.total_quantita or Decimal("0")),
        "percentuale_completamento": min(
            Decimal("100"),
            ((carico.total_quantita or Decimal("0")) / Decimal("300")) * 100
        ),
        "is_completo": (carico.total_quantita or Decimal("0")) >= Decimal("280")
    }


def _build_carico_list_item(db: Session, carico: Carico) -> dict:
    """Costruisce item leggero per liste"""
    mulino = db.query(Mulino).filter(Mulino.id == carico.mulino_id).first()
    trasportatore = None
    if carico.trasportatore_id:
        trasportatore = db.query(Trasportatore).filter(
            Trasportatore.id == carico.trasportatore_id
        ).first()
    
    num_ordini = db.query(Ordine).filter(Ordine.carico_id == carico.id).count()
    
    return {
        "id": carico.id,
        "mulino_id": carico.mulino_id,
        "mulino_nome": mulino.nome if mulino else None,
        "tipo": carico.tipo,
        "stato": carico.stato,
        "data_ritiro": carico.data_ritiro,
        "trasportatore_id": carico.trasportatore_id,
        "trasportatore_nome": trasportatore.nome if trasportatore else None,
        "total_quantita": carico.total_quantita or Decimal("0"),
        "percentuale_completamento": min(
            Decimal("100"),
            ((carico.total_quantita or Decimal("0")) / Decimal("300")) * 100
        ),
        "is_completo": (carico.total_quantita or Decimal("0")) >= Decimal("280"),
        "num_ordini": num_ordini
    }


# === ENDPOINT LISTA E DETTAGLIO ===

@router.get("/", response_model=List[CaricoList])
def lista_carichi(
    stato: Optional[str] = Query(default=None, description="Filtra per stato"),
    tipo: Optional[str] = Query(default=None, description="Filtra per tipo (sfuso/pedane)"),
    mulino_id: Optional[int] = Query(default=None, description="Filtra per mulino"),
    solo_aperti: bool = Query(default=False, description="Mostra solo BOZZA e ASSEGNATO"),
    db: Session = Depends(get_db)
):
    """
    Lista carichi con filtri.
    
    Stati possibili: bozza, assegnato, ritirato, consegnato
    """
    query = db.query(Carico)
    
    if stato is not None:
        query = query.filter(Carico.stato == stato)
    elif solo_aperti:
        query = query.filter(Carico.stato.in_([
            StatoCarico.BOZZA.value, 
            StatoCarico.ASSEGNATO.value
        ]))
    
    if tipo is not None:
        query = query.filter(Carico.tipo == tipo)
    
    if mulino_id is not None:
        query = query.filter(Carico.mulino_id == mulino_id)
    
    carichi = query.order_by(desc(Carico.creato_il)).all()
    
    return [_build_carico_list_item(db, c) for c in carichi]


@router.get("/aperti", response_model=List[CaricoList])
def lista_carichi_aperti(db: Session = Depends(get_db)):
    """Lista rapida carichi aperti (BOZZA + ASSEGNATO) - ottimizzato per mobile"""
    query = db.query(Carico).filter(
        Carico.stato.in_([StatoCarico.BOZZA.value, StatoCarico.ASSEGNATO.value])
    ).order_by(desc(Carico.creato_il))
    
    carichi = query.all()
    return [_build_carico_list_item(db, c) for c in carichi]


@router.get("/bozze", response_model=List[CaricoList])
def lista_carichi_bozza(
    mulino_id: Optional[int] = Query(default=None),
    tipo: Optional[str] = Query(default=None),
    db: Session = Depends(get_db)
):
    """Lista carichi in BOZZA - per composizione carichi"""
    query = db.query(Carico).filter(Carico.stato == StatoCarico.BOZZA.value)
    
    if mulino_id is not None:
        query = query.filter(Carico.mulino_id == mulino_id)
    
    if tipo is not None:
        query = query.filter(Carico.tipo == tipo)
    
    carichi = query.order_by(desc(Carico.creato_il)).all()
    return [_build_carico_list_item(db, c) for c in carichi]


@router.get("/{carico_id}", response_model=CaricoRead)
def dettaglio_carico(carico_id: int, db: Session = Depends(get_db)):
    """Dettaglio singolo carico"""
    carico = db.query(Carico).filter(Carico.id == carico_id).first()
    if not carico:
        raise HTTPException(status_code=404, detail="Carico non trovato")
    
    return _build_carico_read(db, carico)


@router.get("/{carico_id}/ordini", response_model=List[OrdineInCarico])
def ordini_del_carico(carico_id: int, db: Session = Depends(get_db)):
    """Lista ordini contenuti nel carico"""
    carico = db.query(Carico).filter(Carico.id == carico_id).first()
    if not carico:
        raise HTTPException(status_code=404, detail="Carico non trovato")
    
    ordini = db.query(Ordine).filter(Ordine.carico_id == carico_id).all()
    
    risultato = []
    for ordine in ordini:
        from app.models.cliente import Cliente
        cliente = db.query(Cliente).filter(Cliente.id == ordine.cliente_id).first()
        totale = carico_service.calcola_totale_quintali_ordine(db, ordine.id)
        
        risultato.append({
            "id": ordine.id,
            "cliente_id": ordine.cliente_id,
            "cliente_nome": cliente.nome if cliente else None,
            "data_ordine": ordine.data_ordine,
            "data_ritiro": ordine.data_ritiro,
            "tipo_ordine": ordine.tipo_ordine,
            "stato_logistico": ordine.stato_logistico,
            "totale_quintali": totale
        })
    
    return risultato


# === ENDPOINT CREAZIONE ===

@router.post("/", response_model=CaricoRead, status_code=201)
def crea_carico(carico: CaricoCreate, db: Session = Depends(get_db)):
    """
    Crea nuovo carico.
    
    Se vengono passati ordini_ids, vengono validati e assegnati.
    Se viene passato trasportatore + data, il carico sarà ASSEGNATO, altrimenti BOZZA.
    """
    # Verifica mulino
    mulino = db.query(Mulino).filter(Mulino.id == carico.mulino_id).first()
    if not mulino:
        raise HTTPException(status_code=404, detail="Mulino non trovato")
    
    # Verifica trasportatore se specificato
    if carico.trasportatore_id:
        trasportatore = db.query(Trasportatore).filter(
            Trasportatore.id == carico.trasportatore_id
        ).first()
        if not trasportatore:
            raise HTTPException(status_code=404, detail="Trasportatore non trovato")
    
    # Valida ordini se specificati
    totale_quintali = Decimal("0")
    if carico.ordini_ids:
        valido, errori, info = carico_service.validate_load_constraints(
            db, carico.ordini_ids
        )
        if not valido:
            raise HTTPException(status_code=400, detail="; ".join(errori))
        
        # Verifica coerenza con mulino/tipo specificati
        if info['mulino_id'] and info['mulino_id'] != carico.mulino_id:
            raise HTTPException(
                status_code=400,
                detail=f"Mulino ordini ({info['mulino_id']}) diverso da mulino carico ({carico.mulino_id})"
            )
        
        if info['tipo'] and info['tipo'] != carico.tipo:
            raise HTTPException(
                status_code=400,
                detail=f"Tipo ordini ({info['tipo']}) diverso da tipo carico ({carico.tipo})"
            )
        
        totale_quintali = info['totale_quintali']
    
    # Determina stato
    stato = StatoCarico.BOZZA.value
    if carico.trasportatore_id and carico.data_ritiro:
        stato = StatoCarico.ASSEGNATO.value
    
    # Crea carico
    db_carico = Carico(
        mulino_id=carico.mulino_id,
        tipo=carico.tipo,
        trasportatore_id=carico.trasportatore_id,
        data_ritiro=carico.data_ritiro,
        stato=stato,
        total_quantita=totale_quintali,
        note=carico.note
    )
    db.add(db_carico)
    db.flush()
    
    # Assegna ordini
    if carico.ordini_ids:
        stato_logistico = (
            StatoLogisticoOrdine.IN_CARICO.value 
            if stato == StatoCarico.ASSEGNATO.value 
            else StatoLogisticoOrdine.IN_CLUSTER.value
        )
        
        db.query(Ordine).filter(
            Ordine.id.in_(carico.ordini_ids)
        ).update({
            "carico_id": db_carico.id,
            "stato_logistico": stato_logistico
        }, synchronize_session=False)
    
    db.commit()
    db.refresh(db_carico)
    
    return _build_carico_read(db, db_carico)


@router.post("/bozza", response_model=CaricoRead, status_code=201)
def crea_carico_bozza(data: CaricoCreateDraft, db: Session = Depends(get_db)):
    """
    Crea carico BOZZA da ordini (drag&drop).
    
    Il mulino e tipo vengono inferiti dagli ordini.
    """
    carico = carico_service.create_draft_load(
        db, 
        data.ordini_ids,
        data.note
    )
    db.commit()
    db.refresh(carico)
    
    return _build_carico_read(db, carico)


# === ENDPOINT AGGIORNAMENTO ===

@router.put("/{carico_id}", response_model=CaricoRead)
def aggiorna_carico(
    carico_id: int,
    data: CaricoUpdate,
    db: Session = Depends(get_db)
):
    """Aggiorna campi carico (note, trasportatore, data)"""
    carico = db.query(Carico).filter(Carico.id == carico_id).first()
    if not carico:
        raise HTTPException(status_code=404, detail="Carico non trovato")
    
    update_data = data.model_dump(exclude_unset=True)
    
    # Verifica trasportatore se specificato
    if "trasportatore_id" in update_data and update_data["trasportatore_id"]:
        trasportatore = db.query(Trasportatore).filter(
            Trasportatore.id == update_data["trasportatore_id"]
        ).first()
        if not trasportatore:
            raise HTTPException(status_code=404, detail="Trasportatore non trovato")
    
    for field, value in update_data.items():
        setattr(carico, field, value)
    
    db.commit()
    db.refresh(carico)
    
    return _build_carico_read(db, carico)


@router.post("/{carico_id}/assegna", response_model=CaricoRead)
def assegna_trasporto(
    carico_id: int,
    data: CaricoAssignTransport,
    db: Session = Depends(get_db)
):
    """
    Assegna trasportatore e data a carico BOZZA.
    Transizione: BOZZA -> ASSEGNATO
    """
    carico = carico_service.assign_transport(
        db,
        carico_id,
        data.trasportatore_id,
        data.data_ritiro
    )
    db.commit()
    db.refresh(carico)
    
    return _build_carico_read(db, carico)


# === ENDPOINT GESTIONE ORDINI ===

@router.post("/{carico_id}/ordini", response_model=CaricoRead)
def aggiungi_ordine(
    carico_id: int,
    data: AddOrdineToCarico,
    db: Session = Depends(get_db)
):
    """Aggiunge un ordine al carico"""
    carico = carico_service.add_order_to_load(db, data.ordine_id, carico_id)
    db.commit()
    db.refresh(carico)
    
    return _build_carico_read(db, carico)


@router.delete("/{carico_id}/ordini/{ordine_id}", response_model=Optional[CaricoRead])
def rimuovi_ordine(
    carico_id: int,
    ordine_id: int,
    db: Session = Depends(get_db)
):
    """
    Rimuove un ordine dal carico.
    
    Se il carico rimane vuoto o con 1 ordine (e in bozza), viene eliminato.
    In quel caso ritorna null.
    """
    # Verifica che l'ordine appartenga a questo carico
    ordine = db.query(Ordine).filter(Ordine.id == ordine_id).first()
    if not ordine:
        raise HTTPException(status_code=404, detail="Ordine non trovato")
    
    if ordine.carico_id != carico_id:
        raise HTTPException(
            status_code=400, 
            detail=f"Ordine {ordine_id} non appartiene al carico {carico_id}"
        )
    
    carico = carico_service.remove_order_from_load(db, ordine_id)
    db.commit()
    
    if carico:
        db.refresh(carico)
        return _build_carico_read(db, carico)
    
    return None


@router.get("/{carico_id}/ordini-disponibili", response_model=List[OrdineInCarico])
def ordini_disponibili(carico_id: int, db: Session = Depends(get_db)):
    """Lista ordini che possono essere aggiunti a questo carico"""
    ordini = carico_service.get_ordini_disponibili_per_carico(db, carico_id)
    
    risultato = []
    for ordine in ordini:
        from app.models.cliente import Cliente
        cliente = db.query(Cliente).filter(Cliente.id == ordine.cliente_id).first()
        totale = carico_service.calcola_totale_quintali_ordine(db, ordine.id)
        
        risultato.append({
            "id": ordine.id,
            "cliente_id": ordine.cliente_id,
            "cliente_nome": cliente.nome if cliente else None,
            "data_ordine": ordine.data_ordine,
            "data_ritiro": ordine.data_ritiro,
            "tipo_ordine": ordine.tipo_ordine,
            "stato_logistico": ordine.stato_logistico,
            "totale_quintali": totale
        })
    
    return risultato


# === ENDPOINT TRANSIZIONI STATO ===

@router.post("/{carico_id}/ritira", response_model=CaricoRead)
def ritira_carico(carico_id: int, db: Session = Depends(get_db)):
    """
    Segna il carico come ritirato.
    Transizione: ASSEGNATO -> RITIRATO
    """
    carico = carico_service.mark_load_as_picked_up(db, carico_id)
    db.commit()
    db.refresh(carico)
    
    return _build_carico_read(db, carico)


@router.post("/{carico_id}/consegna", response_model=CaricoRead)
def consegna_carico(carico_id: int, db: Session = Depends(get_db)):
    """
    Segna il carico come consegnato.
    Transizione: RITIRATO -> CONSEGNATO
    """
    carico = carico_service.mark_load_as_delivered(db, carico_id)
    db.commit()
    db.refresh(carico)
    
    return _build_carico_read(db, carico)


# === ENDPOINT ELIMINAZIONE ===

@router.delete("/{carico_id}", status_code=204)
def elimina_carico(carico_id: int, db: Session = Depends(get_db)):
    """
    Elimina carico.
    Gli ordini vengono scollegati e tornano APERTO, non eliminati.
    """
    carico = db.query(Carico).filter(Carico.id == carico_id).first()
    if not carico:
        raise HTTPException(status_code=404, detail="Carico non trovato")
    
    if carico.stato in [StatoCarico.RITIRATO.value, StatoCarico.CONSEGNATO.value]:
        raise HTTPException(
            status_code=400,
            detail=f"Non è possibile eliminare carico in stato '{carico.stato}'"
        )
    
    # Scollega ordini
    db.query(Ordine).filter(
        Ordine.carico_id == carico_id
    ).update({
        "carico_id": None,
        "stato_logistico": StatoLogisticoOrdine.APERTO.value
    }, synchronize_session=False)
    
    db.delete(carico)
    db.commit()
    
    return None


# === ENDPOINT VALIDAZIONE ===

@router.post("/valida", response_model=ValidazioneCaricoResult)
def valida_ordini_per_carico(
    ordini_ids: List[int],
    db: Session = Depends(get_db)
):
    """
    Valida se un set di ordini può formare un carico.
    
    Utile per preview drag&drop prima della creazione.
    """
    valido, errori, info = carico_service.validate_load_constraints(db, ordini_ids)
    
    warnings = []
    if valido:
        if info['totale_quintali'] < Decimal("280"):
            warnings.append(f"Carico sotto soglia minima: {info['totale_quintali']}q < 280q")
        elif info['totale_quintali'] < Decimal("300"):
            mancanti = Decimal("300") - info['totale_quintali']
            warnings.append(f"Possibile aggiungere ancora {mancanti}q")
    
    return {
        "valido": valido,
        "errori": errori,
        "warnings": warnings,
        "totale_quintali": info['totale_quintali'],
        "mulino_id": info['mulino_id'],
        "tipo": info['tipo']
    }