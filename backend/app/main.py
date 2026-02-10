from fastapi import FastAPI
from app.router import clienti, prodotti, ordini

app = FastAPI(title="Gestionale farina")

app.include_router(clienti.router, prefix="/clienti")
app.include_router(prodotti.router, prefix="/prodotti")
app.include_router(ordini.router, prefix="/ordini")
