import json
from datetime import datetime
from typing import Optional
from domain.events import EventOut,RifaCreate,SubastaCreate,VentaLimitadaCreate,RifaUpdate,SubastaUpdate,VentaLimitadaUpdate

from infrastructure._db._db import PostgresDB
from fastapi import HTTPException, status


class RepEvents:
    LIMIT = 15

    async def list_events(
        self,
        nombre_usuario: str,
        offset: int = 0,
        fecha_inicio: Optional[datetime] = None,
        fecha_fin: Optional[datetime] = None,
    ) -> list[EventOut]:
        """
        Lista los eventos de un usuario con paginado por offset y filtros opcionales por fecha.
        """
        try:
            async with (await PostgresDB.acquire()) as conn:

                # 1️⃣ Obtener usuario activo
                user = await conn.fetchrow(
                    """
                    SELECT id
                    FROM "User"
                    WHERE username = $1 AND estado = TRUE;
                    """,
                    nombre_usuario,
                )

                if not user:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Usuario no encontrado o inactivo",
                    )

                user_id = user["id"]

                # 2️⃣ Construir filtros dinámicos
                filters = []
                params = [user_id]  # $1 = user_id
                param_idx = 2

                if fecha_inicio:
                    filters.append(f"e.fecha_inicio >= ${param_idx}")
                    params.append(fecha_inicio)
                    param_idx += 1
                if fecha_fin:
                    filters.append(f"e.fecha_fin <= ${param_idx}")
                    params.append(fecha_fin)
                    param_idx += 1

                where_clause = f"AND {' AND '.join(filters)}" if filters else ""

                # 3️⃣ Traer eventos con limit y offset
                query = f"""
                    SELECT e.id, e.nombre, e.tipo, e.estado, e.usuario_id,
                           e.fecha_inicio, e.fecha_fin, e.metadata,
                           e.created_at, e.updated_at
                    FROM Event e
                    WHERE e.usuario_id = $1
                    {where_clause}
                    ORDER BY e.fecha_inicio DESC
                    LIMIT {self.LIMIT} OFFSET {offset};
                """
                rows = await conn.fetch(query, *params)

                return [
                    EventOut.model_validate(
                        {
                            **dict(r),
                            "metadata": json.loads(r["metadata"])
                            if isinstance(r["metadata"], str)
                            else r["metadata"],
                        }
                    )
                    for r in rows
                ]

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    async def list_events_len(
        self,
        nombre_usuario: str,
        fecha_inicio: Optional[datetime] = None,
        fecha_fin: Optional[datetime] = None,
    ) -> int:
        """
        Devuelve la cantidad total de eventos de un usuario que cumplen el filtro de fechas.
        """
        try:
            async with (await PostgresDB.acquire()) as conn:

                # 1️⃣ Obtener usuario activo
                user = await conn.fetchrow(
                    """
                    SELECT id
                    FROM "User"
                    WHERE username = $1 AND estado = TRUE;
                    """,
                    nombre_usuario,
                )

                if not user:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Usuario no encontrado o inactivo",
                    )

                user_id = user["id"]

                # 2️⃣ Construir filtros dinámicos
                filters = []
                params = [user_id]  # $1 = user_id
                param_idx = 2

                if fecha_inicio:
                    filters.append(f"e.fecha_inicio >= ${param_idx}")
                    params.append(fecha_inicio)
                    param_idx += 1
                if fecha_fin:
                    filters.append(f"e.fecha_fin <= ${param_idx}")
                    params.append(fecha_fin)
                    param_idx += 1

                where_clause = f"AND {' AND '.join(filters)}" if filters else ""

                # 3️⃣ Contar eventos
                query = f"""
                    SELECT COUNT(*) as total
                    FROM Event e
                    WHERE e.usuario_id = $1
                    {where_clause};
                """
                row = await conn.fetchrow(query, *params)
                return row["total"]

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
        
    async def create_rifa(self, user_id: int, rifa: RifaCreate) -> EventOut:
        async with (await PostgresDB.acquire()) as conn:
            async with conn.transaction():
                # 1️⃣ Crear Event
                query_event = """
                    INSERT INTO Event (nombre, tipo, estado, usuario_id, fecha_inicio, fecha_fin, metadata)
                    VALUES ($1, 'rifa', 'Proximo', $2, $3, $4, $5)
                    RETURNING *;
                """
                metadata_json = json.dumps(rifa.metadata)
                event_row = await conn.fetchrow(
                    query_event,
                    rifa.nombre, user_id, rifa.fecha_inicio, rifa.fecha_fin, metadata_json
                )

                # 2️⃣ Crear Rifa específica
                query_rifa = """
                    INSERT INTO Rifa (event_id, numero_inicio, numero_fin, numeros_reservados)
                    VALUES ($1, $2, $3, $4)
                """
                await conn.execute(
                    query_rifa,
                    event_row["id"], rifa.numero_inicio, rifa.numero_fin, rifa.numeros_reservados
                )

                return EventOut.model_validate({
                    **dict(event_row),
                    "metadata": rifa.metadata
                })

    async def create_subasta(self, user_id: int, subasta: SubastaCreate) -> EventOut:
        async with (await PostgresDB.acquire()) as conn:
            async with conn.transaction():
                # 1️⃣ Crear Event
                query_event = """
                    INSERT INTO Event (nombre, tipo, estado, usuario_id, fecha_inicio, fecha_fin, metadata)
                    VALUES ($1, 'subasta', 'Proximo', $2, $3, $4, $5)
                    RETURNING *;
                """
                metadata_json = json.dumps(subasta.metadata)
                event_row = await conn.fetchrow(
                    query_event,
                    subasta.nombre, user_id, subasta.fecha_inicio, subasta.fecha_fin, metadata_json
                )

                # 2️⃣ Crear Subasta Items
                query_item = """
                    INSERT INTO SubastaItem (subasta_id, nombre, precio_maximo)
                    VALUES ($1, $2, $3)
                """
                for item in subasta.items:
                    await conn.execute(query_item, event_row["id"], item.nombre, item.precio_maximo)

                return EventOut.model_validate({
                    **dict(event_row),
                    "metadata": subasta.metadata
                })

    async def create_venta_limitada(self, user_id: int, venta: VentaLimitadaCreate) -> EventOut:
        async with (await PostgresDB.acquire()) as conn:
            async with conn.transaction():
                # 1️⃣ Crear Event
                query_event = """
                    INSERT INTO Event (nombre, tipo, estado, usuario_id, fecha_inicio, fecha_fin, metadata)
                    VALUES ($1, 'venta_limitada', 'Proximo', $2, $3, $4, $5)
                    RETURNING *;
                """
                metadata_json = json.dumps(venta.metadata)
                event_row = await conn.fetchrow(
                    query_event,
                    venta.nombre, user_id, venta.fecha_inicio, venta.fecha_fin, metadata_json
                )

                # 2️⃣ Crear VentaLimitada Items
                query_item = """
                    INSERT INTO VentaLimitadaItem (venta_limitada_id, nombre, precio, n_cantidad_maxima)
                    VALUES ($1, $2, $3, $4)
                """
                for item in venta.items:
                    await conn.execute(
                        query_item, event_row["id"], item.nombre, item.precio, item.n_cantidad_maxima
                    )

                return EventOut.model_validate({
                    **dict(event_row),
                    "metadata": venta.metadata
                })

    async def update_rifa(self, event_id: int, update: RifaUpdate) -> EventOut:
        async with (await PostgresDB.acquire()) as conn:
            async with conn.transaction():
                # 1️⃣ Actualizar Event
                fields = []
                params = []
                idx = 1

                for field in ["nombre", "fecha_inicio", "fecha_fin", "metadata", "estado"]:
                    value = getattr(update, field, None)
                    if value is not None:
                        if field == "metadata":
                            value = json.dumps(value)
                        fields.append(f"{field} = ${idx}")
                        params.append(value)
                        idx += 1

                if fields:
                    query = f"UPDATE Event SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP WHERE id = ${idx} RETURNING *"
                    params.append(event_id)
                    event_row = await conn.fetchrow(query, *params)
                else:
                    event_row = await conn.fetchrow("SELECT * FROM Event WHERE id = $1", event_id)

                # 2️⃣ Actualizar Rifa
                rifa_fields = []
                rifa_params = []
                rifa_idx = 1
                for field in ["numero_inicio", "numero_fin", "numeros_reservados"]:
                    value = getattr(update, field, None)
                    if value is not None:
                        rifa_fields.append(f"{field} = ${rifa_idx}")
                        rifa_params.append(value)
                        rifa_idx += 1

                if rifa_fields:
                    rifa_params.append(event_id)
                    query_rifa = f"UPDATE Rifa SET {', '.join(rifa_fields)} WHERE event_id = ${rifa_idx}"
                    await conn.execute(query_rifa, *rifa_params)

                return EventOut.model_validate({
                    **dict(event_row),
                    "metadata": json.loads(event_row["metadata"])
                })
        # ---------- ACTUALIZAR SUBASTA ----------
    
    async def update_subasta(self, event_id: int, update: SubastaUpdate) -> EventOut:
        async with (await PostgresDB.acquire()) as conn:
            async with conn.transaction():
                # 1️⃣ Actualizar Event
                fields = []
                params = []
                idx = 1

                for field in ["nombre", "fecha_inicio", "fecha_fin", "metadata", "estado"]:
                    value = getattr(update, field, None)
                    if value is not None:
                        if field == "metadata":
                            value = json.dumps(value)
                        fields.append(f"{field} = ${idx}")
                        params.append(value)
                        idx += 1

                if fields:
                    query = f"UPDATE Event SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP WHERE id = ${idx} RETURNING *"
                    params.append(event_id)
                    event_row = await conn.fetchrow(query, *params)
                else:
                    event_row = await conn.fetchrow("SELECT * FROM Event WHERE id = $1", event_id)

                # 2️⃣ Actualizar Subasta Items
                if update.items:
                    for i, item in enumerate(update.items):
                        item_fields = []
                        item_params = []
                        item_idx = 1
                        for field in ["nombre", "precio_maximo"]:
                            value = getattr(item, field, None)
                            if value is not None:
                                item_fields.append(f"{field} = ${item_idx}")
                                item_params.append(value)
                                item_idx += 1
                        if item_fields:
                            item_params.append(event_id)
                            item_params.append(i + 1)  # asumiendo que el orden de la lista corresponde a los ids
                            query_item = f"""
                                UPDATE SubastaItem
                                SET {', '.join(item_fields)}
                                WHERE subasta_id = $${item_idx} AND id = (
                                    SELECT id FROM SubastaItem WHERE subasta_id = $${item_idx} ORDER BY id LIMIT 1 OFFSET $${item_idx + 1} - 1
                                )
                            """
                            await conn.execute(query_item, *item_params)

                return EventOut.model_validate({
                    **dict(event_row),
                    "metadata": json.loads(event_row["metadata"])
                })

    async def update_venta_limitada(self, event_id: int, update: VentaLimitadaUpdate) -> EventOut:
        async with (await PostgresDB.acquire()) as conn:
            async with conn.transaction():
                # 1️⃣ Actualizar Event
                fields = []
                params = []
                idx = 1

                for field in ["nombre", "fecha_inicio", "fecha_fin", "metadata", "estado"]:
                    value = getattr(update, field, None)
                    if value is not None:
                        if field == "metadata":
                            value = json.dumps(value)
                        fields.append(f"{field} = ${idx}")
                        params.append(value)
                        idx += 1

                if fields:
                    query = f"UPDATE Event SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP WHERE id = ${idx} RETURNING *"
                    params.append(event_id)
                    event_row = await conn.fetchrow(query, *params)
                else:
                    event_row = await conn.fetchrow("SELECT * FROM Event WHERE id = $1", event_id)

                # 2️⃣ Actualizar VentaLimitada Items
                if update.items:
                    for i, item in enumerate(update.items):
                        item_fields = []
                        item_params = []
                        item_idx = 1
                        for field in ["nombre", "precio", "n_cantidad_maxima", "n_cantidad_vendida"]:
                            value = getattr(item, field, None)
                            if value is not None:
                                item_fields.append(f"{field} = ${item_idx}")
                                item_params.append(value)
                                item_idx += 1
                        if item_fields:
                            item_params.append(event_id)
                            item_params.append(i + 1)
                            query_item = f"""
                                UPDATE VentaLimitadaItem
                                SET {', '.join(item_fields)}
                                WHERE venta_limitada_id = $${item_idx} AND id = (
                                    SELECT id FROM VentaLimitadaItem WHERE venta_limitada_id = $${item_idx} ORDER BY id LIMIT 1 OFFSET $${item_idx + 1} - 1
                                )
                            """
                            await conn.execute(query_item, *item_params)

                return EventOut.model_validate({
                    **dict(event_row),
                    "metadata": json.loads(event_row["metadata"])
                })
    