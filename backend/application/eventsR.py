from fastapi import APIRouter, Query, Depends
from typing import Optional
from datetime import datetime

from domain.events import (
    EventOut,
    RifaCreate, SubastaCreate, VentaLimitadaCreate,
    RifaUpdate, SubastaUpdate, VentaLimitadaUpdate
)
from infrastructure.rep_events import RepEvents
from service_container import ServiceContainer
from application.auth import AuthRouter
from domain.auth import UserCokie


def eventsR(container: ServiceContainer, auth_router: AuthRouter):
    router = APIRouter(prefix="/events", tags=["events"])
    rep_events = container.resolve(RepEvents)

    # -------------------------
    # 📌 LISTAR EVENTOS
    # -------------------------
    @router.get("/", response_model=list[EventOut])
    async def list_events(
        user_name: str,
        offset: int = Query(0),
        fecha_inicio: Optional[datetime] = Query(None),
        fecha_fin: Optional[datetime] = Query(None),
    ):
        return await rep_events.list_events(
            nombre_usuario=user_name,
            offset=offset,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin
        )

    @router.get("/count", response_model=int)
    async def count_events(
        user_name: str,
        fecha_inicio: Optional[datetime] = Query(None),
        fecha_fin: Optional[datetime] = Query(None),
    ):
        return await rep_events.list_events_len(
            nombre_usuario=user_name,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin
        )

    # -------------------------
    # 📌 CREAR RIFA
    # -------------------------
    @router.post("/rifa", response_model=EventOut)
    async def create_rifa(
        data: RifaCreate,
        current_user: UserCokie = Depends(auth_router.get_current_user)
    ):
        return await rep_events.create_rifa(current_user.id, data)

    # -------------------------
    # 📌 CREAR SUBASTA
    # -------------------------
    @router.post("/subasta", response_model=EventOut)
    async def create_subasta(
        data: SubastaCreate,
        current_user: UserCokie = Depends(auth_router.get_current_user)
    ):
        return await rep_events.create_subasta(current_user.id, data)

    # -------------------------
    # 📌 CREAR VENTA LIMITADA
    # -------------------------
    @router.post("/venta-limitada", response_model=EventOut)
    async def create_venta_limitada(
        data: VentaLimitadaCreate,
        current_user: UserCokie = Depends(auth_router.get_current_user)
    ):
        return await rep_events.create_venta_limitada(current_user.id, data)

    # -------------------------
    # 📌 UPDATE RIFA
    # -------------------------
    @router.put("/rifa/{event_id}", response_model=EventOut)
    async def update_rifa(
        event_id: int,
        data: RifaUpdate,
        current_user: UserCokie = Depends(auth_router.get_current_user)
    ):
        return await rep_events.update_rifa(event_id, current_user.id, data)

    # -------------------------
    # 📌 UPDATE SUBASTA
    # -------------------------
    @router.put("/subasta/{event_id}", response_model=EventOut)
    async def update_subasta(
        event_id: int,
        data: SubastaUpdate,
        current_user: UserCokie = Depends(auth_router.get_current_user)
    ):
        return await rep_events.update_subasta(event_id, current_user.id, data)

    # -------------------------
    # 📌 UPDATE VENTA LIMITADA
    # -------------------------
    @router.put("/venta-limitada/{event_id}", response_model=EventOut)
    async def update_venta_limitada(
        event_id: int,
        data: VentaLimitadaUpdate,
        current_user: UserCokie = Depends(auth_router.get_current_user)
    ):
        return await rep_events.update_venta_limitada(event_id, current_user.id, data)

    # -------------------------
    # 📌 DELETE EVENTO
    # -------------------------
    @router.delete("/{event_id}", response_model=dict)
    async def delete_event(
        event_id: int,
        current_user: UserCokie = Depends(auth_router.get_current_user)
    ):
        await rep_events.delete_event(event_id, current_user.id)
        return {"detail": "Evento eliminado correctamente"}

    return router