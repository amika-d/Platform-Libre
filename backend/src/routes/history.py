# from fastapi import APIRouter, HTTPException
# from src.db.database import get_session_history, get_all_sessions

# router = APIRouter()


# @router.get("/sessions")
# async def sessions():
#     """All sessions with query counts and costs."""
#     return await get_all_sessions()


# @router.get("/sessions/{session_id}")
# async def session_history(session_id: str):
#     """Query history for a session."""
#     history = await get_session_history(session_id)
#     if not history:
#         raise HTTPException(status_code=404, detail="Session not found")
#     return {"session_id": session_id, "history": history}
