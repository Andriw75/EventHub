import json
from domain.events import EventCreate, EventUpdate, EventOut
from asyncpg import Connection, UniqueViolationError

from infrastructure._db._db import PostgresDB
from fastapi import HTTPException, status


class RepEvents:

    async def create_event(self, new_event: EventCreate) -> EventOut:
        try:

            async with (await PostgresDB.acquire()) as conn:
                conn: Connection
                async with conn.transaction():
                    row = await conn.fetchrow(
                        """
                        INSERT INTO Event (nombre, tipo, estado, usuario_id, fecha_inicio, fecha_fin, metadata)
                        VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)
                        RETURNING id, nombre, tipo, estado, usuario_id, fecha_inicio, fecha_fin, metadata, created_at, updated_at;
                        """,
                        new_event.nombre,
                        new_event.tipo.value,
                        new_event.estado.value,
                        new_event.usuario_id,
                        new_event.fecha_inicio,
                        new_event.fecha_fin,
                        json.dumps(new_event.metadata)
                    )
                    row = dict(row)
                    if isinstance(row.get("metadata"), str):
                        row["metadata"] = json.loads(row["metadata"])

                    return EventOut.model_validate(row)

        except UniqueViolationError:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe un evento con este nombre para el usuario."
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    async def list_events_by_name(self, nombre_usuario: str) -> list[EventOut]:
        """
        Lista los eventos de un usuario por su nombre
        """
        try:
            async with (await PostgresDB.acquire()) as conn:

                user = await conn.fetchrow(
                    """
                    SELECT id
                    FROM "User"
                    WHERE username = $1 AND estado = TRUE;
                    """,
                    nombre_usuario
                )

                if not user:
                    raise HTTPException(
                        status_code=404,
                        detail="Usuario no encontrado o inactivo"
                    )

                rows = await conn.fetch(
                    """
                    SELECT e.id, e.nombre, e.tipo, e.estado, e.usuario_id,
                        e.fecha_inicio, e.fecha_fin, e.metadata,
                        e.created_at, e.updated_at
                    FROM Event e
                    WHERE e.usuario_id = $1
                    ORDER BY e.fecha_inicio DESC;
                    """,
                    user["id"]
                )

                return [
                    EventOut.model_validate(
                        {
                            **dict(r),
                            "metadata": json.loads(r["metadata"])
                            if isinstance(r["metadata"], str)
                            else r["metadata"]
                        }
                    )
                    for r in rows
                ]

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    async def update_event(self, event_id: int, update_data: EventUpdate, current_user_id: int) -> EventOut:
        try:
            async with PostgresDB.transaction() as conn:
                    # Validar propietario
                    owner_check = await conn.fetchrow(
                        "SELECT usuario_id FROM Event WHERE id=$1",
                        event_id
                    )
                    if owner_check is None:
                        raise HTTPException(status_code=404, detail="Evento no encontrado.")
                    if owner_check["usuario_id"] != current_user_id:
                        raise HTTPException(status_code=403, detail="No tienes permiso para modificar este evento.")

                    set_clauses = []
                    values = []
                    idx = 1
                    for field, value in update_data.model_dump(exclude_unset=True).items():
                        if field == "metadata" and value is not None:
                            clause = f"{field} = ${idx}::jsonb"
                            value = json.dumps(value)
                        else:
                            clause = f"{field} = ${idx}"
                        set_clauses.append(clause)
                        values.append(value)
                        idx += 1

                    if not set_clauses:
                        raise HTTPException(status_code=400, detail="No hay campos para actualizar.")

                    values.append(event_id)
                    query = f"""
                        UPDATE Event
                        SET {', '.join(set_clauses)}, updated_at=CURRENT_TIMESTAMP
                        WHERE id = ${idx}
                        RETURNING id, nombre, tipo, estado, usuario_id, fecha_inicio, fecha_fin, metadata, created_at, updated_at;
                    """

                    row = await conn.fetchrow(query, *values)
                    row = dict(row)
                    if isinstance(row.get("metadata"), str):
                        row["metadata"] = json.loads(row["metadata"])

                    return EventOut.model_validate(row)

        except UniqueViolationError:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                detail="Ya existe un evento con este nombre para el usuario.")
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    async def delete_event(self, event_id: int, current_user_id: int):
        try:
            async with  PostgresDB.transaction() as conn:
                    owner_check = await conn.fetchrow(
                        "SELECT usuario_id FROM Event WHERE id=$1",
                        event_id
                    )
                    if owner_check is None:
                        raise HTTPException(status_code=404, detail="Evento no encontrado.")
                    if owner_check["usuario_id"] != current_user_id:
                        raise HTTPException(status_code=403, detail="No tienes permiso para eliminar este evento.")

                    result = await conn.execute("DELETE FROM Event WHERE id=$1", event_id)
                    if result[-1] == "0":
                        raise HTTPException(status_code=404, detail="Evento no encontrado.")
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
