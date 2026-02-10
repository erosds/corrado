from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def lista_prodotti():
    return {"messaggio": "Lista prodotti vuota"}
