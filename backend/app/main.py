from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth import get_current_user, get_password_hash
from app.database import Base, SessionLocal, engine
from app.models.utente import Utente
from app.routers import (
    carichi,
    clienti,
    composizione_carichi,
    mulini,
    ordini,
    pagamenti,
    prodotti,
    trasportatori,
)
from app.routers import auth as auth_router


def seed_admin_user():
    """Crea utente admin di default se non esiste nessun utente."""
    db = SessionLocal()
    try:
        if db.query(Utente).count() == 0:
            admin = Utente(
                username="admin",
                hashed_password=get_password_hash("admin"),
            )
            db.add(admin)
            db.commit()
            print("Utente admin creato (username: admin, password: admin)")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: crea tabelle e seed admin
    Base.metadata.create_all(bind=engine)
    seed_admin_user()
    yield


app = FastAPI(
    title="Gestionale Farina - Corrado",
    description="Web app per gestione ordini e provvigioni agente molini",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS - permette al frontend di chiamare le API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        # Aggiungere qui il dominio di produzione IONOS
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router pubblico (auth)
app.include_router(auth_router.router, prefix="/api/auth", tags=["Auth"])

# Router protetti (richiedono autenticazione)
auth_deps = [Depends(get_current_user)]
app.include_router(clienti.router, prefix="/api/clienti", tags=["Clienti"], dependencies=auth_deps)
app.include_router(mulini.router, prefix="/api/mulini", tags=["Mulini"], dependencies=auth_deps)
app.include_router(prodotti.router, prefix="/api/prodotti", tags=["Prodotti"], dependencies=auth_deps)
app.include_router(trasportatori.router, prefix="/api/trasportatori", tags=["Trasportatori"], dependencies=auth_deps)
app.include_router(ordini.router, prefix="/api/ordini", tags=["Ordini"], dependencies=auth_deps)
app.include_router(carichi.router, prefix="/api/carichi", tags=["Carichi"], dependencies=auth_deps)
app.include_router(pagamenti.router, prefix="/api/pagamenti", tags=["Pagamenti"], dependencies=auth_deps)
app.include_router(composizione_carichi.router, prefix="/api/composizione-carichi", tags=["Composizione Carichi"], dependencies=auth_deps)


@app.get("/", tags=["Root"])
def root():
    return {"messaggio": "Gestionale Farina API", "versione": "1.0.0"}


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}
