from fastapi import APIRouter, HTTPException, Query, Depends, Body
from domain.events import EventCreate, EventUpdate, EventOut, EventBase
from infrastructure.rep_events import RepEvents
from service_container import ServiceContainer
from application.auth import AuthRouter
from domain.auth import UserCokie

def eventsR(container: ServiceContainer, auth_router: AuthRouter):
    router = APIRouter(prefix="/events", tags=["events"])
    rep_events = container.resolve(RepEvents)

    @router.post("/", response_model=EventOut)
    async def create_event(
        new_event: EventBase,
        current_user: UserCokie = Depends(auth_router.get_current_user)
    ):
        event_to_create = EventCreate(**new_event.model_dump(), usuario_id=current_user.id)
        return await rep_events.create_event(event_to_create)

    @router.put("/", response_model=EventOut)
    async def update_event(
        event_id: int = Query(...),
        update_data: EventUpdate = Body(...),
        current_user: UserCokie = Depends(auth_router.get_current_user)
    ):
        return await rep_events.update_event(event_id, update_data, current_user.id)

    @router.get("/", response_model=list[EventOut])
    async def list_events(nombre_usuario: str = Query(...)):
        return await rep_events.list_events_by_name(nombre_usuario)

    @router.delete("/", response_model=dict)
    async def delete_event(
        event_id: int = Query(...),
        current_user: UserCokie = Depends(auth_router.get_current_user)
    ):
        await rep_events.delete_event(event_id, current_user.id)
        return {"detail": "Evento eliminado correctamente"}

    return router