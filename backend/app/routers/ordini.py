from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from pydantic import BaseModel

from app.database import get_db
from app.models.ordine import Ordine, RigaOrdine
from app.models.cliente import Cliente
from app.models.prodotto import Prodotto
from app.models.mulino import Mulino
from app.models.trasportatore import Trasportatore
from app.models.storico_prezzo import StoricoPrezzo
from app.schemas.ordine import (
    OrdineCreate, OrdineUpdate, OrdineRead, OrdineList, OrdineDettaglio
)
from app.services.email import send_email, MAIL_FROM

router = APIRouter()


class EmailEntry(BaseModel):
    mulino_id: int
    to: str
    subject: str
    body: str


class InviaEmailRequest(BaseModel):
    emails: List[EmailEntry]


def calcola_data_incasso_riba(data_consegna: date) -> date:
    """
    Calcola data incasso per clienti RIBA: +60 giorni fine mese dalla consegna.
    Esempio: consegna 15/01 -> fine mese = 31/01 -> +60gg = 01/04 (circa)
    """
    if not data_consegna:
        return None
    
    # Vai a fine mese della data consegna
    if data_consegna.month == 12:
        fine_mese = date(data_consegna.year + 1, 1, 1) - timedelta(days=1)
    else:
        fine_mese = date(data_consegna.year, data_consegna.month + 1, 1) - timedelta(days=1)
    
    # Aggiungi 60 giorni
    return fine_mese + timedelta(days=60)


def salva_storico_prezzo(db: Session, cliente_id: int, prodotto_id: int, prezzo: Decimal):
    """Salva il prezzo nello storico per futura consultazione"""
    storico = StoricoPrezzo(
        cliente_id=cliente_id,
        prodotto_id=prodotto_id,
        prezzo=prezzo
    )
    db.add(storico)


# ==========================================
# ENDPOINT SPECIFICI (DEVONO STARE PRIMA DI /{ordine_id})
# ==========================================

@router.get("/ultimo-prezzo/{cliente_id}/{prodotto_id}")
def get_ultimo_prezzo(cliente_id: int, prodotto_id: int, db: Session = Depends(get_db)):
    """
    Ottiene l'ultimo prezzo applicato a un cliente per un prodotto specifico.
    Utile durante l'inserimento ordine per suggerire il prezzo.
    
    NOTA: Questo endpoint DEVE stare prima di /{ordine_id} per evitare
    che FastAPI interpreti "ultimo-prezzo" come un ordine_id.
    """
    ultimo = db.query(StoricoPrezzo).filter(
        StoricoPrezzo.cliente_id == cliente_id,
        StoricoPrezzo.prodotto_id == prodotto_id
    ).order_by(desc(StoricoPrezzo.creato_il)).first()
    
    if not ultimo:
        return {"prezzo": None, "messaggio": "Nessun prezzo precedente trovato"}
    
    return {
        "prezzo": float(ultimo.prezzo),
        "data": ultimo.creato_il
    }


@router.get("/mail-config")
def get_mail_config():
    """Ritorna la configurazione email (mittente)"""
    return {"mail_from": MAIL_FROM}


@router.post("/{ordine_id}/invia-email")
def invia_email_ordine(ordine_id: int, request: InviaEmailRequest, db: Session = Depends(get_db)):
    """Invia email dell'ordine ai mulini"""
    ordine = db.query(Ordine).filter(Ordine.id == ordine_id).first()
    if not ordine:
        raise HTTPException(status_code=404, detail="Ordine non trovato")

    if ordine.email_inviata_il is not None:
        raise HTTPException(status_code=400, detail="Email già inviata per questo ordine")

    for entry in request.emails:
        send_email(to=entry.to, subject=entry.subject, body=entry.body)

    ordine.email_inviata_il = datetime.now(timezone.utc)
    db.commit()

    return {"message": "Email inviate con successo", "email_inviata_il": ordine.email_inviata_il}


# ==========================================
# ENDPOINT LISTA
# ==========================================

@router.get("/", response_model=List[OrdineList])
def lista_ordini(
    cliente_id: Optional[int] = Query(None, description="Filtra per cliente"),
    stato: Optional[str] = Query(None, description="Filtra per stato (inserito/ritirato)"),
    data_da: Optional[date] = Query(None, description="Data ordine da"),
    data_a: Optional[date] = Query(None, description="Data ordine a"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Lista ordini con filtri e righe dettagliate"""
    query = db.query(
        Ordine.id,
        Ordine.cliente_id,
        Cliente.nome.label("cliente_nome"),
        Ordine.data_ordine,
        Ordine.data_ritiro,
        Ordine.data_incasso_mulino,
        Ordine.tipo_ordine,
        Ordine.stato,
        Ordine.trasportatore_id,
        Trasportatore.nome.label("trasportatore_nome"),
        Ordine.carico_id
    ).join(Cliente).outerjoin(Trasportatore)
    
    if cliente_id:
        query = query.filter(Ordine.cliente_id == cliente_id)
    
    if stato:
        query = query.filter(Ordine.stato == stato)
    
    if data_da:
        query = query.filter(Ordine.data_ordine >= data_da)
    
    if data_a:
        query = query.filter(Ordine.data_ordine <= data_a)
    
    ordini = query.order_by(desc(Ordine.data_ordine)).offset(skip).limit(limit).all()
    
    # Calcola totali e righe per ogni ordine
    risultati = []
    for o in ordini:
        totali = db.query(
            func.sum(RigaOrdine.quintali).label("totale_quintali"),
            func.sum(RigaOrdine.prezzo_totale).label("totale_importo")
        ).filter(RigaOrdine.ordine_id == o.id).first()
        
        # Recupera righe con dettagli prodotto e mulino
        righe_db = db.query(RigaOrdine).filter(RigaOrdine.ordine_id == o.id).all()
        righe_lista = []
        for riga in righe_db:
            prodotto = db.query(Prodotto).filter(Prodotto.id == riga.prodotto_id).first()
            mulino = db.query(Mulino).filter(Mulino.id == riga.mulino_id).first()
            righe_lista.append({
                "id": riga.id,
                "pedane": riga.pedane,
                "prodotto_nome": prodotto.nome if prodotto else None,
                "prodotto_tipologia": prodotto.tipologia if prodotto else None,
                "mulino_id": riga.mulino_id,
                "mulino_nome": mulino.nome if mulino else None,
                "quintali": riga.quintali,
                "prezzo_quintale": riga.prezzo_quintale,
                "prezzo_totale": riga.prezzo_totale
            })
        
        risultati.append({
            "id": o.id,
            "cliente_id": o.cliente_id,
            "cliente_nome": o.cliente_nome,
            "data_ordine": o.data_ordine,
            "data_ritiro": o.data_ritiro,
            "data_incasso_mulino": o.data_incasso_mulino,
            "tipo_ordine": o.tipo_ordine,
            "stato": o.stato,
            "trasportatore_id": o.trasportatore_id,
            "trasportatore_nome": o.trasportatore_nome,
            "carico_id": o.carico_id,
            "totale_quintali": totali.totale_quintali or Decimal("0"),
            "totale_importo": totali.totale_importo or Decimal("0"),
            "righe": righe_lista
        })
    
    return risultati


# ==========================================
# ENDPOINT DETTAGLIO (DEVE STARE DOPO GLI ENDPOINT SPECIFICI)
# ==========================================

@router.get("/{ordine_id}", response_model=OrdineDettaglio)
def get_ordine(ordine_id: int, db: Session = Depends(get_db)):
    """Dettaglio singolo ordine con tutte le righe e indirizzi"""
    ordine = db.query(Ordine).options(
        joinedload(Ordine.righe),
        joinedload(Ordine.cliente),
        joinedload(Ordine.trasportatore)
    ).filter(Ordine.id == ordine_id).first()
    
    if not ordine:
        raise HTTPException(status_code=404, detail="Ordine non trovato")
    
    # Costruisci risposta con dettagli incluso indirizzo mulino
    righe_dettaglio = []
    for riga in ordine.righe:
        prodotto = db.query(Prodotto).filter(Prodotto.id == riga.prodotto_id).first()
        mulino = db.query(Mulino).filter(Mulino.id == riga.mulino_id).first()
        righe_dettaglio.append({
            "id": riga.id,
            "prodotto_id": riga.prodotto_id,
            "mulino_id": riga.mulino_id,
            "pedane": riga.pedane,
            "quintali": riga.quintali,
            "prezzo_quintale": riga.prezzo_quintale,
            "prezzo_totale": riga.prezzo_totale,
            "prodotto_nome": prodotto.nome if prodotto else None,
            "prodotto_tipologia": prodotto.tipologia if prodotto else None,
            "mulino_nome": mulino.nome if mulino else None,
            "mulino_indirizzo": mulino.indirizzo_ritiro if mulino else None,
            "mulino_email": mulino.email1 if mulino else None
        })

    return {
        "id": ordine.id,
        "cliente_id": ordine.cliente_id,
        "cliente_nome": ordine.cliente.nome if ordine.cliente else None,
        "cliente_indirizzo": ordine.cliente.indirizzo_consegna if ordine.cliente else None,
        "data_ordine": ordine.data_ordine,
        "data_ritiro": ordine.data_ritiro,
        "data_incasso_mulino": ordine.data_incasso_mulino,
        "tipo_ordine": ordine.tipo_ordine,
        "trasportatore_id": ordine.trasportatore_id,
        "trasportatore_nome": ordine.trasportatore.nome if ordine.trasportatore else None,
        "carico_id": ordine.carico_id,
        "stato": ordine.stato,
        "note": ordine.note,
        "creato_il": ordine.creato_il,
        "email_inviata_il": ordine.email_inviata_il,
        "mail_from": MAIL_FROM,
        "righe": righe_dettaglio
    }


# ==========================================
# ENDPOINT CREAZIONE
# ==========================================

@router.post("/", response_model=OrdineRead, status_code=201)
def crea_ordine(ordine: OrdineCreate, db: Session = Depends(get_db)):
    """
    Crea nuovo ordine con righe.
    - Se cliente ha flag RIBA e c'è data_ritiro, calcola automaticamente data_incasso_mulino
    - Salva i prezzi nello storico per ogni riga
    """
    # Verifica cliente
    cliente = db.query(Cliente).filter(Cliente.id == ordine.cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=400, detail="Cliente non trovato")
    
    # Prepara dati ordine
    ordine_data = ordine.model_dump(exclude={"righe"})
    
    # Calcola data incasso RIBA se necessario
    if cliente.riba and ordine.data_ritiro and not ordine.data_incasso_mulino:
        ordine_data["data_incasso_mulino"] = calcola_data_incasso_riba(ordine.data_ritiro)
    
    # Crea ordine
    db_ordine = Ordine(**ordine_data)
    db.add(db_ordine)
    db.flush()  # Per ottenere l'ID
    
    # Crea righe e salva storico prezzi
    for riga_data in ordine.righe:
        # Verifica prodotto
        prodotto = db.query(Prodotto).filter(Prodotto.id == riga_data.prodotto_id).first()
        if not prodotto:
            raise HTTPException(status_code=400, detail=f"Prodotto {riga_data.prodotto_id} non trovato")
        
        # Crea riga
        db_riga = RigaOrdine(
            ordine_id=db_ordine.id,
            **riga_data.model_dump()
        )
        db.add(db_riga)
        
        # Salva storico prezzo
        salva_storico_prezzo(
            db,
            cliente_id=ordine.cliente_id,
            prodotto_id=riga_data.prodotto_id,
            prezzo=riga_data.prezzo_quintale
        )
    
    db.commit()
    db.refresh(db_ordine)
    return db_ordine


# ==========================================
# ENDPOINT AGGIORNAMENTO
# ==========================================

@router.put("/{ordine_id}", response_model=OrdineRead)
def aggiorna_ordine(
    ordine_id: int,
    ordine: OrdineUpdate,
    db: Session = Depends(get_db)
):
    db_ordine = db.query(Ordine).filter(Ordine.id == ordine_id).first()
    if not db_ordine:
        raise HTTPException(status_code=404, detail="Ordine non trovato")

    update_data = ordine.model_dump(exclude={"righe"}, exclude_unset=True)

    # Update campi ordine
    for field, value in update_data.items():
        setattr(db_ordine, field, value)

    # ===== GESTIONE RIGHE =====
    if ordine.righe is not None:

        # Cancella righe esistenti
        db.query(RigaOrdine).filter(RigaOrdine.ordine_id == ordine_id).delete()

        # Ricrea righe
        for riga_data in ordine.righe:
            db_riga = RigaOrdine(
                ordine_id=ordine_id,
                **riga_data.model_dump()
            )
            db.add(db_riga)

            # Salva storico prezzo
            salva_storico_prezzo(
                db,
                cliente_id=db_ordine.cliente_id,
                prodotto_id=riga_data.prodotto_id,
                prezzo=riga_data.prezzo_quintale
            )

    db.commit()
    db.refresh(db_ordine)
    return db_ordine

# ==========================================
# ENDPOINT ELIMINAZIONE
# ==========================================

@router.delete("/{ordine_id}", status_code=204)
def elimina_ordine(ordine_id: int, db: Session = Depends(get_db)):
    """Elimina ordine e relative righe"""
    db_ordine = db.query(Ordine).filter(Ordine.id == ordine_id).first()
    if not db_ordine:
        raise HTTPException(status_code=404, detail="Ordine non trovato")
    
    db.delete(db_ordine)
    db.commit()
    return None