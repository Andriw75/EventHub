from fastapi import APIRouter, Query, Depends, WebSocket
from typing import Optional
from datetime import datetime

from domain.events import (
    EventOut, EventType, EventFullOut,
    RifaCreate, SubastaCreate, VentaLimitadaCreate,
    RifaUpdate, SubastaUpdate, VentaLimitadaUpdate
)
from infrastructure.rep_events import RepEvents
from service_container import ServiceContainer
from application.mnj_ws import WebSocketManager
from application.auth import AuthRouter
from domain.auth import UserCokie


def eventsRW(container: ServiceContainer, auth_router: AuthRouter):
    router = APIRouter(prefix="/events", tags=["events"])
    rep_events = container.resolve(RepEvents)

    # CONEXION WS
    ws_mng = WebSocketManager()

    async def handle_event_subscription(connection_id: str, ws: WebSocket, data: dict):
        event_id = data.get("event_id")

        if not event_id:
            await ws.send_json({
                "event": "error",
                "message": "event_id missing"
            })
            return

        channel = f"event_{event_id}"

        event_data = await rep_events.get_event_full_by_id(event_id)

        if not event_data:
            await ws.send_json({
                "event": "error",
                "message": "event not found"
            })

            await ws_mng.disconnect(connection_id)
            return

        await ws_mng.subscribe(connection_id, channel)
        await ws.send_json({
            "event": "event_data",
            "data": event_data.model_dump(mode='json')
        })

    ws_mng.register_message_handler("suscribe_event",handle_event_subscription)

    async def handle_event_unsubscription(connection_id: str, ws: WebSocket, data: dict):
        event_id = data.get("event_id")

        if not event_id:
            await ws.send_json({
                "event": "error",
                "message": "event_id missing"
            })
            return

        channel = f"event_{event_id}"

        await ws_mng.unsubscribe(connection_id, channel)

    ws_mng.register_message_handler("unsuscribe_event", handle_event_unsubscription)

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

    @router.get("/by-type", response_model=list[EventFullOut])
    async def list_events_by_type(
        tipo: EventType,
        current_user: UserCokie = Depends(auth_router.get_current_user),
        offset: int = Query(0),
        fecha_inicio: Optional[datetime] = Query(None),
        fecha_fin: Optional[datetime] = Query(None),
    ):
        return await rep_events.list_events_by_type(
            user_id=current_user.id,
            tipo=tipo,
            offset=offset,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin
        )
    
    @router.get("/by-type-count", response_model=int)
    async def count_events_by_type(
        tipo: EventType,
        current_user: UserCokie = Depends(auth_router.get_current_user),
        fecha_inicio: Optional[datetime] = Query(None),
        fecha_fin: Optional[datetime] = Query(None),
    ):
        return await rep_events.list_events_by_type_len(
            user_id=current_user.id,
            tipo=tipo,
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