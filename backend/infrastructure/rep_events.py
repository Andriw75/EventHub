import json
from datetime import datetime
from typing import Optional
from domain.events import ( EventOut, EventType, EventFullOut,
                            RifaCreate, RifaUpdate, RifaOut, 
                            SubastaCreate, SubastaUpdate, SubastaOut,
                            VentaLimitadaCreate, VentaLimitadaUpdate, VentaLimitadaOut )

from infrastructure._db._db import PostgresDB
from fastapi import HTTPException, status

def parse_metadata(value):
    if isinstance(value, str):
        return json.loads(value)
    return value

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
                    filters.append(f"e.created_at >= ${param_idx}")
                    params.append(fecha_inicio)
                    param_idx += 1

                if fecha_fin:
                    filters.append(f"e.created_at <= ${param_idx}")
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
                    ORDER BY e.created_at DESC
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
                    filters.append(f"e.created_at >= ${param_idx}")
                    params.append(fecha_inicio)
                    param_idx += 1

                if fecha_fin:
                    filters.append(f"e.created_at <= ${param_idx}")
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

    async def delete_event(self, event_id: int, user_id: int) -> bool:
        async with (await PostgresDB.acquire()) as conn:
            async with conn.transaction():

                # 1️⃣ Verificar que el evento existe y pertenece al usuario
                event = await conn.fetchrow(
                    """
                    SELECT id, tipo
                    FROM Event
                    WHERE id = $1 AND usuario_id = $2;
                    """,
                    event_id,
                    user_id
                )

                if not event:
                    raise HTTPException(
                        status_code=404,
                        detail="Evento no encontrado o no pertenece al usuario"
                    )

                tipo = event["tipo"]

                # 2️⃣ Eliminar según tipo
                if tipo == "rifa":
                    await conn.execute(
                        "DELETE FROM Rifa WHERE event_id = $1;",
                        event_id
                    )

                elif tipo == "subasta":
                    # primero items
                    await conn.execute(
                        "DELETE FROM SubastaItem WHERE subasta_id = $1;",
                        event_id
                    )

                    # (si tienes tabla Subasta, elimínala también)
                    await conn.execute(
                        "DELETE FROM Subasta WHERE event_id = $1;",
                        event_id
                    )

                elif tipo == "venta_limitada":
                    # primero items
                    await conn.execute(
                        "DELETE FROM VentaLimitadaItem WHERE venta_limitada_id = $1;",
                        event_id
                    )

                    # (si tienes tabla VentaLimitada)
                    await conn.execute(
                        "DELETE FROM VentaLimitada WHERE event_id = $1;",
                        event_id
                    )

                else:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Tipo de evento desconocido: {tipo}"
                    )

                # 3️⃣ Finalmente eliminar el evento
                await conn.execute(
                    "DELETE FROM Event WHERE id = $1;",
                    event_id
                )

                return True

    async def update_rifa(self, event_id: int, user_id: int, data: RifaUpdate) -> EventOut:
        async with (await PostgresDB.acquire()) as conn:
            async with conn.transaction():
                # 1. Verificar que el evento existe y pertenece al usuario
                event = await conn.fetchrow(
                    """
                    SELECT id, tipo, metadata
                    FROM Event
                    WHERE id = $1 AND usuario_id = $2
                    """,
                    event_id, user_id
                )
                if not event:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Evento no encontrado o no pertenece al usuario"
                    )
                if event["tipo"] != "rifa":
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="El evento no es de tipo rifa"
                    )

                # 2. Actualizar campos de la tabla Event (dinámicamente)
                update_fields = []
                params = []
                param_idx = 1

                if data.nombre is not None:
                    update_fields.append(f"nombre = ${param_idx}")
                    params.append(data.nombre)
                    param_idx += 1
                if data.fecha_inicio is not None:
                    update_fields.append(f"fecha_inicio = ${param_idx}")
                    params.append(data.fecha_inicio)
                    param_idx += 1
                if data.fecha_fin is not None:
                    update_fields.append(f"fecha_fin = ${param_idx}")
                    params.append(data.fecha_fin)
                    param_idx += 1
                if data.metadata is not None:
                    update_fields.append(f"metadata = ${param_idx}")
                    params.append(json.dumps(data.metadata))
                    param_idx += 1
                if data.estado is not None:
                    update_fields.append(f"estado = ${param_idx}")
                    params.append(data.estado.value)
                    param_idx += 1

                if update_fields:
                    query = f"""
                        UPDATE Event
                        SET {', '.join(update_fields)}, updated_at = NOW()
                        WHERE id = ${param_idx}
                        RETURNING *
                    """
                    params.append(event_id)
                    event_row = await conn.fetchrow(query, *params)
                else:
                    # Si no se actualiza ningún campo de Event, obtener los datos actuales
                    event_row = await conn.fetchrow(
                        "SELECT * FROM Event WHERE id = $1", event_id
                    )

                # 3. Actualizar campos de la tabla Rifa (dinámicamente)
                update_rifa_fields = []
                rifa_params = []
                rifa_idx = 1

                if data.numero_inicio is not None:
                    update_rifa_fields.append(f"numero_inicio = ${rifa_idx}")
                    rifa_params.append(data.numero_inicio)
                    rifa_idx += 1
                if data.numero_fin is not None:
                    update_rifa_fields.append(f"numero_fin = ${rifa_idx}")
                    rifa_params.append(data.numero_fin)
                    rifa_idx += 1
                if data.numeros_reservados is not None:
                    update_rifa_fields.append(f"numeros_reservados = ${rifa_idx}")
                    rifa_params.append(data.numeros_reservados)  # ya es lista, se serializa automáticamente? asynpg lo maneja como JSONB si la columna es jsonb
                    rifa_idx += 1

                if update_rifa_fields:
                    query = f"""
                        UPDATE Rifa
                        SET {', '.join(update_rifa_fields)}
                        WHERE event_id = ${rifa_idx}
                    """
                    rifa_params.append(event_id)
                    await conn.execute(query, *rifa_params)

                # 4. Devolver el evento actualizado (reconstruir metadata)
                return EventOut.model_validate({
                    **dict(event_row),
                    "metadata": json.loads(event_row["metadata"]) if isinstance(event_row["metadata"], str) else event_row["metadata"]
                })

    async def update_subasta(self, event_id: int, user_id: int, data: SubastaUpdate) -> EventOut:
        async with (await PostgresDB.acquire()) as conn:
            async with conn.transaction():
                # 1. Verificar evento y tipo
                event = await conn.fetchrow(
                    """
                    SELECT id, tipo, metadata
                    FROM Event
                    WHERE id = $1 AND usuario_id = $2
                    """,
                    event_id, user_id
                )
                if not event:
                    raise HTTPException(status_code=404, detail="Evento no encontrado o no pertenece al usuario")
                if event["tipo"] != "subasta":
                    raise HTTPException(status_code=400, detail="El evento no es de tipo subasta")

                # 2. Actualizar Event (igual que en rifa)
                update_fields = []
                params = []
                param_idx = 1

                if data.nombre is not None:
                    update_fields.append(f"nombre = ${param_idx}")
                    params.append(data.nombre)
                    param_idx += 1
                if data.fecha_inicio is not None:
                    update_fields.append(f"fecha_inicio = ${param_idx}")
                    params.append(data.fecha_inicio)
                    param_idx += 1
                if data.fecha_fin is not None:
                    update_fields.append(f"fecha_fin = ${param_idx}")
                    params.append(data.fecha_fin)
                    param_idx += 1
                if data.metadata is not None:
                    update_fields.append(f"metadata = ${param_idx}")
                    params.append(json.dumps(data.metadata))
                    param_idx += 1
                if data.estado is not None:
                    update_fields.append(f"estado = ${param_idx}")
                    params.append(data.estado.value)
                    param_idx += 1

                if update_fields:
                    query = f"""
                        UPDATE Event
                        SET {', '.join(update_fields)}, updated_at = NOW()
                        WHERE id = ${param_idx}
                        RETURNING *
                    """
                    params.append(event_id)
                    event_row = await conn.fetchrow(query, *params)
                else:
                    event_row = await conn.fetchrow("SELECT * FROM Event WHERE id = $1", event_id)

                # 3. Manejo de items
                if data.items is not None:
                    # Eliminar items existentes
                    await conn.execute(
                        "DELETE FROM SubastaItem WHERE subasta_id = $1",
                        event_id
                    )
                    # Insertar nuevos items
                    for item in data.items:
                        await conn.execute(
                            """
                            INSERT INTO SubastaItem (subasta_id, nombre, precio_maximo)
                            VALUES ($1, $2, $3)
                            """,
                            event_id, item.nombre, item.precio_maximo
                        )

                # 4. Devolver evento
                return EventOut.model_validate({
                    **dict(event_row),
                    "metadata": json.loads(event_row["metadata"]) if isinstance(event_row["metadata"], str) else event_row["metadata"]
                })

    async def update_venta_limitada(self, event_id: int, user_id: int, data: VentaLimitadaUpdate) -> EventOut:
        async with (await PostgresDB.acquire()) as conn:
            async with conn.transaction():
                # 1. Verificar evento y tipo
                event = await conn.fetchrow(
                    """
                    SELECT id, tipo, metadata
                    FROM Event
                    WHERE id = $1 AND usuario_id = $2
                    """,
                    event_id, user_id
                )
                if not event:
                    raise HTTPException(status_code=404, detail="Evento no encontrado o no pertenece al usuario")
                if event["tipo"] != "venta_limitada":
                    raise HTTPException(status_code=400, detail="El evento no es de tipo venta limitada")

                # 2. Actualizar Event (igual que antes)
                update_fields = []
                params = []
                param_idx = 1

                if data.nombre is not None:
                    update_fields.append(f"nombre = ${param_idx}")
                    params.append(data.nombre)
                    param_idx += 1
                if data.fecha_inicio is not None:
                    update_fields.append(f"fecha_inicio = ${param_idx}")
                    params.append(data.fecha_inicio)
                    param_idx += 1
                if data.fecha_fin is not None:
                    update_fields.append(f"fecha_fin = ${param_idx}")
                    params.append(data.fecha_fin)
                    param_idx += 1
                if data.metadata is not None:
                    update_fields.append(f"metadata = ${param_idx}")
                    params.append(json.dumps(data.metadata))
                    param_idx += 1
                if data.estado is not None:
                    update_fields.append(f"estado = ${param_idx}")
                    params.append(data.estado.value)
                    param_idx += 1

                if update_fields:
                    query = f"""
                        UPDATE Event
                        SET {', '.join(update_fields)}, updated_at = NOW()
                        WHERE id = ${param_idx}
                        RETURNING *
                    """
                    params.append(event_id)
                    event_row = await conn.fetchrow(query, *params)
                else:
                    event_row = await conn.fetchrow("SELECT * FROM Event WHERE id = $1", event_id)

                # 3. Manejo de items
                if data.items is not None:
                    # Eliminar items existentes
                    await conn.execute(
                        "DELETE FROM VentaLimitadaItem WHERE venta_limitada_id = $1",
                        event_id
                    )
                    # Insertar nuevos items
                    for item in data.items:
                        await conn.execute(
                            """
                            INSERT INTO VentaLimitadaItem (venta_limitada_id, nombre, precio, n_cantidad_maxima)
                            VALUES ($1, $2, $3, $4)
                            """,
                            event_id, item.nombre, item.precio, item.n_cantidad_maxima
                        )

                # 4. Devolver evento
                return EventOut.model_validate({
                    **dict(event_row),
                    "metadata": json.loads(event_row["metadata"]) if isinstance(event_row["metadata"], str) else event_row["metadata"]
                })

    async def list_events_by_type_len(
        self,
        user_id:int,
        tipo: EventType,
        fecha_inicio: Optional[datetime] = None,
        fecha_fin: Optional[datetime] = None,
    ) -> int:
        try:
            async with (await PostgresDB.acquire()) as conn:

                filters = ["e.tipo = $2"]
                params = [user_id, tipo.value]
                param_idx = 3

                if fecha_inicio:
                    filters.append(f"e.created_at >= ${param_idx}")
                    params.append(fecha_inicio)
                    param_idx += 1

                if fecha_fin:
                    filters.append(f"e.created_at <= ${param_idx}")
                    params.append(fecha_fin)
                    param_idx += 1

                where_clause = " AND ".join(filters)

                query = f"""
                    SELECT COUNT(*) as total
                    FROM Event e
                    WHERE e.usuario_id = $1 AND {where_clause};
                """

                row = await conn.fetchrow(query, *params)
                return row["total"]

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(500, str(e))

    async def list_events_by_type(
        self,
        user_id: int,
        tipo: EventType,
        offset: int = 0,
        fecha_inicio: Optional[datetime] = None,
        fecha_fin: Optional[datetime] = None,
    ) -> list[EventFullOut]:
        try:
            async with (await PostgresDB.acquire()) as conn:

                filters = ["e.tipo = $2"]
                params = [user_id, tipo.value]
                param_idx = 3

                if fecha_inicio:
                    filters.append(f"e.created_at >= ${param_idx}")
                    params.append(fecha_inicio)
                    param_idx += 1

                if fecha_fin:
                    filters.append(f"e.created_at <= ${param_idx}")
                    params.append(fecha_fin)
                    param_idx += 1

                where_clause = " AND ".join(filters)

                query = f"""
                    SELECT *
                    FROM Event e
                    WHERE e.usuario_id = $1 AND {where_clause}
                    ORDER BY e.created_at DESC
                    LIMIT {self.LIMIT} OFFSET {offset};
                """

                rows = await conn.fetch(query, *params)

                results: list[EventFullOut] = []

                for r in rows:
                    base = {
                        **dict(r),
                        "metadata": parse_metadata(r["metadata"]),
                    }

                    if tipo == EventType.rifa:
                        rifa = await conn.fetchrow(
                            "SELECT * FROM Rifa WHERE event_id = $1",
                            r["id"]
                        )
                        results.append(
                            RifaOut.model_validate({
                                **base,
                                **dict(rifa)
                            })
                        )

                    elif tipo == EventType.subasta:
                        items = await conn.fetch(
                            "SELECT nombre, precio_maximo FROM SubastaItem WHERE subasta_id = $1",
                            r["id"]
                        )
                        results.append(
                            SubastaOut.model_validate({
                                **base,
                                "items": [dict(i) for i in items]
                            })
                        )

                    elif tipo == EventType.venta_limitada:
                        items = await conn.fetch(
                            """
                            SELECT nombre, precio, n_cantidad_maxima
                            FROM VentaLimitadaItem
                            WHERE venta_limitada_id = $1
                            """,
                            r["id"]
                        )
                        results.append(
                            VentaLimitadaOut.model_validate({
                                **base,
                                "items": [dict(i) for i in items]
                            })
                        )

                return results

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(500, str(e))

