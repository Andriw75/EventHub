
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, constr, conint, field_validator

# ---------- ENUMS ----------
class EventType(str, Enum):
    rifa = "rifa"
    subasta = "subasta"
    venta_limitada = "venta_limitada"

class EventState(str, Enum):
    Proximo = "Proximo"
    En_curso = "En_curso"
    Finalizado = "Finalizado"

# ---------- EVENT OUT PARA PAGINADO ----------
class EventOut(BaseModel):
    id: int
    usuario_id: int
    nombre: constr(strip_whitespace=True, min_length=1, max_length=100)
    tipo: EventType
    estado: EventState
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = {}
    created_at: datetime

    model_config = {
        "from_attributes": True
    }

# ---------- RIFA ----------
class RifaCreate(BaseModel):
    nombre: constr(strip_whitespace=True, min_length=1, max_length=100)
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    numero_inicio: conint(ge=1)
    numero_fin: conint(ge=1)
    numeros_reservados: List[int] = Field(default_factory=list)
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

    @field_validator("fecha_fin")
    @classmethod
    def fecha_fin_mayor_que_inicio(cls, v, info):
        fecha_inicio = info.data.get("fecha_inicio")
        if fecha_inicio and v and v < fecha_inicio:
            raise ValueError("fecha_fin debe ser mayor o igual a fecha_inicio")
        return v

class RifaUpdate(BaseModel):
    nombre: Optional[constr(strip_whitespace=True, min_length=1, max_length=100)] | None = None
    fecha_inicio: Optional[datetime] | None = None
    fecha_fin: Optional[datetime] | None = None
    numero_inicio: Optional[conint(ge=1)] | None = None
    numero_fin: Optional[conint(ge=1)] | None = None
    numeros_reservados: Optional[List[int]] | None = None
    metadata: Optional[Dict[str, Any]] | None = None
    estado: Optional[EventState] | None = None

# ---------- SUBASTA ----------
class SubastaItemCreate(BaseModel):
    nombre: str
    precio_maximo: float

class SubastaCreate(BaseModel):
    nombre: constr(strip_whitespace=True, min_length=1, max_length=100)
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    items: List[SubastaItemCreate]
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

    @field_validator("fecha_fin")
    @classmethod
    def fecha_fin_mayor_que_inicio(cls, v, info):
        fecha_inicio = info.data.get("fecha_inicio")
        if fecha_inicio and v and v < fecha_inicio:
            raise ValueError("fecha_fin debe ser mayor o igual a fecha_inicio")
        return v

class SubastaItemUpdate(BaseModel):
    nombre: Optional[str] | None = None
    precio_maximo: Optional[float] | None = None

class SubastaUpdate(BaseModel):
    nombre: Optional[constr(strip_whitespace=True, min_length=1, max_length=100)] | None = None
    fecha_inicio: Optional[datetime] | None = None
    fecha_fin: Optional[datetime] | None = None
    items: Optional[List[SubastaItemUpdate]] | None = None
    metadata: Optional[Dict[str, Any]] | None = None
    estado: Optional[EventState] | None = None

# ---------- VENTA LIMITADA ----------
class VentaLimitadaItemCreate(BaseModel):
    nombre: str
    precio: float
    n_cantidad_maxima: conint(ge=0)

class VentaLimitadaCreate(BaseModel):
    nombre: constr(strip_whitespace=True, min_length=1, max_length=100)
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    items: List[VentaLimitadaItemCreate]
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

    @field_validator("fecha_fin")
    @classmethod
    def fecha_fin_mayor_que_inicio(cls, v, info):
        fecha_inicio = info.data.get("fecha_inicio")
        if fecha_inicio and v and v < fecha_inicio:
            raise ValueError("fecha_fin debe ser mayor o igual a fecha_inicio")
        return v

class VentaLimitadaItemUpdate(BaseModel):
    nombre: Optional[str] | None = None
    precio: Optional[float] | None = None
    n_cantidad_maxima: Optional[int] | None = None
    n_cantidad_vendida: Optional[int] | None = None

class VentaLimitadaUpdate(BaseModel):
    nombre: Optional[constr(strip_whitespace=True, min_length=1, max_length=100)] | None = None
    fecha_inicio: Optional[datetime] | None = None
    fecha_fin: Optional[datetime] | None = None
    items: Optional[List[VentaLimitadaItemUpdate]] | None = None
    metadata: Optional[Dict[str, Any]] | None = None
    estado: Optional[EventState] | None = None