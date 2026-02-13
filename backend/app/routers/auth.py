from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.utente import Utente
from app.auth import verify_password, create_access_token, get_current_user, get_password_hash
from app.schemas.auth import LoginRequest, ChangePasswordRequest, TokenResponse, UserResponse

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(Utente).filter(Utente.username == request.username).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username o password non validi",
        )
    token = create_access_token(data={"sub": user.username})
    return TokenResponse(access_token=token)


@router.put("/password")
def change_password(
    request: ChangePasswordRequest,
    current_user: Utente = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(request.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password attuale non corretta",
        )
    current_user.hashed_password = get_password_hash(request.new_password)
    db.commit()
    return {"detail": "Password aggiornata"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: Utente = Depends(get_current_user)):
    return current_user
