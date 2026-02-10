from app.models.cliente import Cliente
from app.models.mulino import Mulino
from app.models.prodotto import Prodotto
from app.models.trasportatore import Trasportatore
from app.models.ordine import Ordine, RigaOrdine
from app.models.storico_prezzo import StoricoPrezzo
from app.models.carico import Carico

__all__ = [
    "Cliente",
    "Mulino",
    "Prodotto",
    "Trasportatore",
    "Ordine",
    "RigaOrdine",
    "StoricoPrezzo",
    "Carico",
]