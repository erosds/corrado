from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import clienti, mulini, prodotti, trasportatori, ordini, carichi, statistiche

app = FastAPI(
    title="Gestionale Farina - Corrado",
    description="Web app per gestione ordini e provvigioni agente molini",
    version="1.0.0"
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

# Routers
app.include_router(clienti.router, prefix="/api/clienti", tags=["Clienti"])
app.include_router(mulini.router, prefix="/api/mulini", tags=["Mulini"])
app.include_router(prodotti.router, prefix="/api/prodotti", tags=["Prodotti"])
app.include_router(trasportatori.router, prefix="/api/trasportatori", tags=["Trasportatori"])
app.include_router(ordini.router, prefix="/api/ordini", tags=["Ordini"])
app.include_router(carichi.router, prefix="/api/carichi", tags=["Carichi"])
app.include_router(statistiche.router, prefix="/api/statistiche", tags=["Statistiche"])


@app.get("/", tags=["Root"])
def root():
    return {"messaggio": "Gestionale Farina API", "versione": "1.0.0"}


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}