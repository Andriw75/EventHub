from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator, constr

class EventType(str, Enum):
    rifa = "rifa"
    subasta = "subasta"
    venta_limitada = "venta_limitada"

class EventState(str, Enum):
    Proximo = "Proximo"
    En_curso = "En_curso"
    Finalizado = "Finalizado"

class EventBase(BaseModel):
    nombre: constr(strip_whitespace=True, min_length=1, max_length=100)
    tipo: EventType
    estado: EventState = EventState.Proximo
    fecha_inicio: Optional[datetime]
    fecha_fin: Optional[datetime]
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

    @field_validator("fecha_fin")
    @classmethod
    def fecha_fin_mayor_que_inicio(cls, v, info):
        fecha_inicio = info.data.get("fecha_inicio")
        if fecha_inicio and v and v < fecha_inicio:
            raise ValueError("fecha_fin debe ser mayor o igual a fecha_inicio")
        return v

class EventCreate(EventBase):
    usuario_id: int

class EventUpdate(BaseModel):
    nombre: constr(strip_whitespace=True, min_length=1, max_length=100) | None = None
    tipo: EventType | None = None
    estado: EventState | None = None
    fecha_inicio: datetime | None = None
    fecha_fin: datetime | None = None
    metadata: Dict[str, Any] | None = None

    @field_validator("fecha_fin")
    @classmethod
    def fecha_fin_mayor_que_inicio(cls, v, info):
        fecha_inicio = info.data.get("fecha_inicio")
        if fecha_inicio and v and v < fecha_inicio:
            raise ValueError("fecha_fin debe ser mayor o igual a fecha_inicio")
        return v

class EventOut(EventBase):
    id: int
    usuario_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True
    }