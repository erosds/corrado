from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.cliente import Cliente

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/")
def lista_clienti(db: Session = Depends(get_db)):
    return db.query(Cliente).all()

@router.post("/")
def crea_cliente(dati: dict, db: Session = Depends(get_db)):
    cliente = Cliente(**dati)
    db.add(cliente)
    db.commit()
    return cliente
