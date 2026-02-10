from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def lista_ordini():
    return {"messaggio": "Lista ordini vuota"}
