"""
Service Layer per Carichi

Logica di business centralizzata per:
- Validazione vincoli di dominio
- Creazione/gestione carichi
- Sincronizzazione total_quantita
- Gestione stati ordini
"""

from sqlalchemy.orm import Session
from sqlalchemy import func
from decimal import Decimal
from datetime import date
from typing import List, Optional, Tuple
from fastapi import HTTPException

from app.models.carico import Carico, StatoCarico, TipoCarico
from app.models.ordine import Ordine, RigaOrdine, StatoLogisticoOrdine
from app.models.mulino import Mulino
from app.models.trasportatore import Trasportatore


# === COSTANTI DI DOMINIO ===
MAX_QUINTALI_CARICO = Decimal("300")
SOGLIA_MINIMA_QUINTALI = Decimal("280")
SOGLIA_ORDINE_SINGOLO = Decimal("280")  # Ordine >= 280 diventa carico automatico


# === FUNZIONI DI VALIDAZIONE ===

def get_mulino_principale_ordine(db: Session, ordine_id: int) -> Tuple[Optional[int], Optional[str]]:
    """
    Restituisce (mulino_id, mulino_nome) del mulino con più quintali nell'ordine.
    """
    result = db.query(
        RigaOrdine.mulino_id,
        Mulino.nome,
        func.sum(RigaOrdine.quintali).label('totale')
    ).join(
        Mulino, RigaOrdine.mulino_id == Mulino.id
    ).filter(
        RigaOrdine.ordine_id == ordine_id
    ).group_by(
        RigaOrdine.mulino_id, Mulino.nome
    ).order_by(
        func.sum(RigaOrdine.quintali).desc()
    ).first()
    
    if result:
        return result[0], result[1]
    return None, None


def calcola_totale_quintali_ordine(db: Session, ordine_id: int) -> Decimal:
    """Calcola il totale quintali di un ordine dalle sue righe"""
    result = db.query(
        func.sum(RigaOrdine.quintali)
    ).filter(RigaOrdine.ordine_id == ordine_id).scalar()
    return result or Decimal("0")


def calcola_totale_quintali_carico(db: Session, carico_id: int) -> Decimal:
    """Calcola il totale quintali di un carico sommando le righe degli ordini"""
    result = db.query(
        func.sum(RigaOrdine.quintali)
    ).join(
        Ordine, RigaOrdine.ordine_id == Ordine.id
    ).filter(
        Ordine.carico_id == carico_id
    ).scalar()
    return result or Decimal("0")


def validate_load_constraints(
    db: Session, 
    order_ids: List[int],
    exclude_carico_id: Optional[int] = None
) -> Tuple[bool, List[str], dict]:
    """
    Valida che gli ordini possano stare nello stesso carico.
    
    Vincoli:
    - Stesso mulino
    - Stesso tipo (sfuso/pedane)
    - Somma quantità <= 300 quintali
    
    Returns:
        (valido, lista_errori, info_dict)
        info_dict contiene: mulino_id, mulino_nome, tipo, totale_quintali
    """
    errori = []
    info = {
        'mulino_id': None,
        'mulino_nome': None,
        'tipo': None,
        'totale_quintali': Decimal("0")
    }
    
    if not order_ids:
        return False, ["Nessun ordine specificato"], info
    
    # Carica ordini
    ordini = db.query(Ordine).filter(Ordine.id.in_(order_ids)).all()
    
    if len(ordini) != len(order_ids):
        trovati = {o.id for o in ordini}
        mancanti = set(order_ids) - trovati
        return False, [f"Ordini non trovati: {mancanti}"], info
    
    # Verifica che non siano già in altri carichi
    for ordine in ordini:
        if ordine.carico_id and ordine.carico_id != exclude_carico_id:
            errori.append(f"Ordine {ordine.id} già assegnato al carico {ordine.carico_id}")
    
    if errori:
        return False, errori, info
    
    # Raccogli mulino e tipo per ogni ordine
    mulini = set()
    tipi = set()
    totale = Decimal("0")
    
    for ordine in ordini:
        # Tipo ordine
        tipi.add(ordine.tipo_ordine)
        
        # Mulino principale dell'ordine
        mulino_id, mulino_nome = get_mulino_principale_ordine(db, ordine.id)
        if mulino_id:
            mulini.add((mulino_id, mulino_nome))
        
        # Quintali
        totale += calcola_totale_quintali_ordine(db, ordine.id)
    
    # Verifica stesso tipo
    if len(tipi) > 1:
        errori.append(f"Tipi ordine misti non ammessi: {tipi}")
    else:
        info['tipo'] = list(tipi)[0] if tipi else None
    
    # Verifica stesso mulino
    if len(mulini) > 1:
        nomi = [m[1] for m in mulini]
        errori.append(f"Mulini diversi non ammessi nello stesso carico: {nomi}")
    elif mulini:
        mulino = list(mulini)[0]
        info['mulino_id'] = mulino[0]
        info['mulino_nome'] = mulino[1]
    
    # Verifica limite quintali
    info['totale_quintali'] = totale
    if totale > MAX_QUINTALI_CARICO:
        errori.append(f"Superato limite quintali: {totale}q > {MAX_QUINTALI_CARICO}q")
    
    return len(errori) == 0, errori, info


# === FUNZIONI DI SINCRONIZZAZIONE ===

def recalculate_load_total(db: Session, carico_id: int) -> Decimal:
    """
    Ricalcola e aggiorna total_quantita del carico.
    Deve essere chiamata ogni volta che cambiano gli ordini del carico.
    """
    carico = db.query(Carico).filter(Carico.id == carico_id).first()
    if not carico:
        raise HTTPException(status_code=404, detail=f"Carico {carico_id} non trovato")
    
    nuovo_totale = calcola_totale_quintali_carico(db, carico_id)
    carico.total_quantita = nuovo_totale
    db.flush()
    
    return nuovo_totale


def update_ordine_stato_logistico(
    db: Session, 
    ordine: Ordine, 
    nuovo_stato: StatoLogisticoOrdine
):
    """Aggiorna lo stato logistico di un ordine"""
    ordine.stato_logistico = nuovo_stato.value
    db.flush()


# === FUNZIONI DI CREAZIONE ===

def create_draft_load(
    db: Session, 
    order_ids: List[int],
    note: Optional[str] = None
) -> Carico:
    """
    Crea un carico in stato BOZZA da una lista di ordini.
    
    Usato per:
    - Drag&drop di ordini piccoli
    - Raggruppamento manuale ordini
    
    Il carico eredita mulino e tipo dagli ordini (che devono essere compatibili).
    """
    # Valida vincoli
    valido, errori, info = validate_load_constraints(db, order_ids)
    if not valido:
        raise HTTPException(status_code=400, detail="; ".join(errori))
    
    # Crea carico
    carico = Carico(
        mulino_id=info['mulino_id'],
        tipo=info['tipo'],
        stato=StatoCarico.BOZZA.value,
        total_quantita=info['totale_quintali'],
        note=note
    )
    db.add(carico)
    db.flush()  # Per ottenere l'ID
    
    # Assegna ordini al carico
    for ordine_id in order_ids:
        ordine = db.query(Ordine).filter(Ordine.id == ordine_id).first()
        ordine.carico_id = carico.id
        ordine.stato_logistico = StatoLogisticoOrdine.IN_CLUSTER.value
    
    db.flush()
    return carico


def create_load_from_large_order(
    db: Session, 
    ordine_id: int,
    trasportatore_id: int,
    data_ritiro: date
) -> Carico:
    """
    Crea un carico da un ordine singolo >= 280q.
    
    A differenza di create_draft_load, questo crea direttamente
    un carico ASSEGNATO perché l'ordine da solo soddisfa la soglia minima.
    """
    ordine = db.query(Ordine).filter(Ordine.id == ordine_id).first()
    if not ordine:
        raise HTTPException(status_code=404, detail=f"Ordine {ordine_id} non trovato")
    
    if ordine.carico_id:
        raise HTTPException(
            status_code=400, 
            detail=f"Ordine già assegnato al carico {ordine.carico_id}"
        )
    
    totale = calcola_totale_quintali_ordine(db, ordine_id)
    if totale < SOGLIA_ORDINE_SINGOLO:
        raise HTTPException(
            status_code=400,
            detail=f"Ordine {totale}q < {SOGLIA_ORDINE_SINGOLO}q - non può diventare carico singolo"
        )
    
    # Verifica trasportatore
    trasportatore = db.query(Trasportatore).filter(
        Trasportatore.id == trasportatore_id
    ).first()
    if not trasportatore:
        raise HTTPException(status_code=404, detail="Trasportatore non trovato")
    
    # Ottieni mulino
    mulino_id, _ = get_mulino_principale_ordine(db, ordine_id)
    
    # Crea carico già assegnato
    carico = Carico(
        mulino_id=mulino_id,
        tipo=ordine.tipo_ordine,
        trasportatore_id=trasportatore_id,
        data_ritiro=data_ritiro,
        stato=StatoCarico.ASSEGNATO.value,
        total_quantita=totale
    )
    db.add(carico)
    db.flush()
    
    # Assegna ordine
    ordine.carico_id = carico.id
    ordine.stato_logistico = StatoLogisticoOrdine.IN_CARICO.value
    
    db.flush()
    return carico


# === FUNZIONI DI ASSEGNAZIONE ===

def assign_transport(
    db: Session,
    carico_id: int,
    trasportatore_id: int,
    data_ritiro: date
) -> Carico:
    """
    Assegna trasportatore e data a un carico BOZZA.
    Transizione: BOZZA -> ASSEGNATO
    """
    carico = db.query(Carico).filter(Carico.id == carico_id).first()
    if not carico:
        raise HTTPException(status_code=404, detail="Carico non trovato")
    
    if carico.stato != StatoCarico.BOZZA.value:
        raise HTTPException(
            status_code=400,
            detail=f"Solo carichi in BOZZA possono essere assegnati (stato attuale: {carico.stato})"
        )
    
    # Verifica trasportatore
    trasportatore = db.query(Trasportatore).filter(
        Trasportatore.id == trasportatore_id
    ).first()
    if not trasportatore:
        raise HTTPException(status_code=404, detail="Trasportatore non trovato")
    
    # Aggiorna carico
    carico.trasportatore_id = trasportatore_id
    carico.data_ritiro = data_ritiro
    carico.stato = StatoCarico.ASSEGNATO.value
    
    # Aggiorna stato ordini
    ordini = db.query(Ordine).filter(Ordine.carico_id == carico_id).all()
    for ordine in ordini:
        ordine.stato_logistico = StatoLogisticoOrdine.IN_CARICO.value
    
    db.flush()
    return carico


# === FUNZIONI DI GESTIONE ORDINI ===

def add_order_to_load(
    db: Session,
    ordine_id: int,
    carico_id: int
) -> Carico:
    """
    Aggiunge un ordine a un carico esistente.
    
    Valida:
    - Compatibilità mulino e tipo
    - Limite quintali non superato
    - Carico in stato modificabile (BOZZA)
    """
    carico = db.query(Carico).filter(Carico.id == carico_id).first()
    if not carico:
        raise HTTPException(status_code=404, detail="Carico non trovato")
    
    if carico.stato != StatoCarico.BOZZA.value:
        raise HTTPException(
            status_code=400,
            detail=f"Carico non modificabile: stato '{carico.stato}'"
        )
    
    ordine = db.query(Ordine).filter(Ordine.id == ordine_id).first()
    if not ordine:
        raise HTTPException(status_code=404, detail="Ordine non trovato")
    
    if ordine.carico_id:
        raise HTTPException(
            status_code=400,
            detail=f"Ordine già assegnato al carico {ordine.carico_id}"
        )
    
    # Verifica compatibilità tipo
    if ordine.tipo_ordine != carico.tipo:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo ordine '{ordine.tipo_ordine}' incompatibile con carico '{carico.tipo}'"
        )
    
    # Verifica compatibilità mulino
    mulino_ordine, _ = get_mulino_principale_ordine(db, ordine_id)
    if mulino_ordine != carico.mulino_id:
        raise HTTPException(
            status_code=400,
            detail=f"Mulino ordine ({mulino_ordine}) diverso da mulino carico ({carico.mulino_id})"
        )
    
    # Verifica limite quintali
    quintali_ordine = calcola_totale_quintali_ordine(db, ordine_id)
    nuovo_totale = carico.total_quantita + quintali_ordine
    
    if nuovo_totale > MAX_QUINTALI_CARICO:
        raise HTTPException(
            status_code=400,
            detail=f"Limite superato: {nuovo_totale}q > {MAX_QUINTALI_CARICO}q"
        )
    
    # Assegna ordine
    ordine.carico_id = carico_id
    ordine.stato_logistico = StatoLogisticoOrdine.IN_CLUSTER.value
    
    # Aggiorna totale carico
    carico.total_quantita = nuovo_totale
    
    db.flush()
    return carico


def remove_order_from_load(
    db: Session,
    ordine_id: int
) -> Optional[Carico]:
    """
    Rimuove un ordine dal suo carico.
    
    Regole:
    - Se rimangono 0 ordini -> elimina carico
    - Se rimane 1 ordine e carico non assegnato -> elimina carico
    
    Returns:
        Il carico aggiornato, o None se è stato eliminato
    """
    ordine = db.query(Ordine).filter(Ordine.id == ordine_id).first()
    if not ordine:
        raise HTTPException(status_code=404, detail="Ordine non trovato")
    
    if not ordine.carico_id:
        raise HTTPException(status_code=400, detail="Ordine non assegnato a nessun carico")
    
    carico_id = ordine.carico_id
    carico = db.query(Carico).filter(Carico.id == carico_id).first()
    
    if carico.stato not in [StatoCarico.BOZZA.value, StatoCarico.ASSEGNATO.value]:
        raise HTTPException(
            status_code=400,
            detail=f"Non è possibile rimuovere ordini da carico in stato '{carico.stato}'"
        )
    
    # Scollega ordine
    ordine.carico_id = None
    ordine.stato_logistico = StatoLogisticoOrdine.APERTO.value
    db.flush()
    
    # Conta ordini rimanenti
    ordini_rimanenti = db.query(Ordine).filter(Ordine.carico_id == carico_id).count()
    
    # Logica di eliminazione carico
    elimina_carico = False
    
    if ordini_rimanenti == 0:
        elimina_carico = True
    elif ordini_rimanenti == 1 and carico.stato == StatoCarico.BOZZA.value:
        # Se rimane 1 ordine e il carico è in bozza, elimina
        # (un ordine singolo piccolo non ha senso come carico)
        elimina_carico = True
        # Scollega anche l'ultimo ordine
        ultimo_ordine = db.query(Ordine).filter(Ordine.carico_id == carico_id).first()
        if ultimo_ordine:
            ultimo_ordine.carico_id = None
            ultimo_ordine.stato_logistico = StatoLogisticoOrdine.APERTO.value
    
    if elimina_carico:
        db.delete(carico)
        db.flush()
        return None
    
    # Ricalcola totale
    recalculate_load_total(db, carico_id)
    db.refresh(carico)
    
    return carico


# === FUNZIONI DI TRANSIZIONE STATO ===

def mark_load_as_picked_up(db: Session, carico_id: int) -> Carico:
    """
    Segna il carico come ritirato.
    Transizione: ASSEGNATO -> RITIRATO
    """
    carico = db.query(Carico).filter(Carico.id == carico_id).first()
    if not carico:
        raise HTTPException(status_code=404, detail="Carico non trovato")
    
    if carico.stato != StatoCarico.ASSEGNATO.value:
        raise HTTPException(
            status_code=400,
            detail=f"Solo carichi ASSEGNATI possono essere ritirati (stato: {carico.stato})"
        )
    
    carico.stato = StatoCarico.RITIRATO.value
    
    # Aggiorna ordini
    ordini = db.query(Ordine).filter(Ordine.carico_id == carico_id).all()
    for ordine in ordini:
        ordine.stato_logistico = StatoLogisticoOrdine.SPEDITO.value
        ordine.stato = "ritirato"  # Mantiene compatibilità con stato legacy
    
    db.flush()
    return carico


def mark_load_as_delivered(db: Session, carico_id: int) -> Carico:
    """
    Segna il carico come consegnato.
    Transizione: RITIRATO -> CONSEGNATO
    """
    carico = db.query(Carico).filter(Carico.id == carico_id).first()
    if not carico:
        raise HTTPException(status_code=404, detail="Carico non trovato")
    
    if carico.stato != StatoCarico.RITIRATO.value:
        raise HTTPException(
            status_code=400,
            detail=f"Solo carichi RITIRATI possono essere consegnati (stato: {carico.stato})"
        )
    
    carico.stato = StatoCarico.CONSEGNATO.value
    db.flush()
    
    return carico


# === FUNZIONI DI QUERY ===

def get_carichi_aperti_per_mulino(
    db: Session, 
    mulino_id: int, 
    tipo: Optional[str] = None
) -> List[Carico]:
    """
    Restituisce i carichi in BOZZA per un mulino specifico.
    Utile per suggerire dove aggiungere ordini.
    """
    query = db.query(Carico).filter(
        Carico.mulino_id == mulino_id,
        Carico.stato == StatoCarico.BOZZA.value
    )
    
    if tipo:
        query = query.filter(Carico.tipo == tipo)
    
    return query.order_by(Carico.creato_il.desc()).all()


def get_ordini_disponibili_per_carico(
    db: Session,
    carico_id: int
) -> List[Ordine]:
    """
    Restituisce gli ordini che possono essere aggiunti a un carico.
    
    Filtri:
    - Stesso mulino del carico
    - Stesso tipo del carico
    - Non assegnati ad altri carichi
    - Quantità totale non supererebbe 300q
    """
    carico = db.query(Carico).filter(Carico.id == carico_id).first()
    if not carico:
        return []
    
    quintali_disponibili = MAX_QUINTALI_CARICO - carico.total_quantita
    
    # Query ordini compatibili
    ordini = db.query(Ordine).filter(
        Ordine.carico_id.is_(None),
        Ordine.tipo_ordine == carico.tipo,
        Ordine.stato_logistico == StatoLogisticoOrdine.APERTO.value
    ).all()
    
    # Filtra per mulino e quintali
    compatibili = []
    for ordine in ordini:
        mulino_ordine, _ = get_mulino_principale_ordine(db, ordine.id)
        if mulino_ordine != carico.mulino_id:
            continue
        
        quintali = calcola_totale_quintali_ordine(db, ordine.id)
        if quintali <= quintali_disponibili:
            compatibili.append(ordine)
    
    return compatibili