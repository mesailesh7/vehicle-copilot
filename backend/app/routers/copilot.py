from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session
from app.database import get_session
from app.models.user import User
from app.routers.auth import get_current_user
from app.services.copilot import generate_copilot_response

router = APIRouter(prefix="/api/v1/copilot", tags=["copilot"])

class ChatRequest(BaseModel):
    vehicle_id: int
    question: str

class ChatResponse(BaseModel):
    vehicle_id: int
    question: str
    answer: str

@router.post("/chat", response_model=ChatResponse)
async def chat_with_copilot(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    tenant_id = current_user.tenant_id or 1
    try:
        answer = await generate_copilot_response(
            vehicle_id=request.vehicle_id,
            tenant_id=tenant_id,
            question=request.question,
            session=session,
        )
        return ChatResponse(
            vehicle_id=request.vehicle_id,
            question=request.question,
            answer=answer,
        )
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Copilot diagnostic error: {str(e)}")