export type EventType = "rifa" | "subasta" | "venta_limitada";
export type EventState = "Proximo" | "En_curso" | "Finalizado";

export interface PersonEvents {
  id: number;
  usuario_id: number;
  nombre: string;
  tipo: EventType;
  estado: EventState;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface EventFilters {
  user_name: string;
  offset?: number;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
}

export interface RifaCreate {
  nombre: string;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  numero_inicio: number;
  numero_fin: number;
  numeros_reservados?: number[];
  metadata?: Record<string, any>;
}

export interface RifaUpdate {
  nombre?: string | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  numero_inicio?: number | null;
  numero_fin?: number | null;
  numeros_reservados?: number[] | null;
  metadata?: Record<string, any> | null;
  estado?: EventState | null;
}

export interface SubastaItemCreate {
  nombre: string;
  precio_maximo: number;
}

export interface SubastaItemUpdate {
  nombre?: string | null;
  precio_maximo?: number | null;
}

export interface SubastaCreate {
  nombre: string;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  items: SubastaItemCreate[];
  metadata?: Record<string, any>;
}

export interface SubastaUpdate {
  nombre?: string | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  items?: SubastaItemUpdate[] | null;
  metadata?: Record<string, any> | null;
  estado?: EventState | null;
}

export interface VentaLimitadaItemCreate {
  nombre: string;
  precio: number;
  n_cantidad_maxima: number;
}

export interface VentaLimitadaItemUpdate {
  nombre?: string | null;
  precio?: number | null;
  n_cantidad_maxima?: number | null;
  n_cantidad_vendida?: number | null;
}

export interface VentaLimitadaCreate {
  nombre: string;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  items: VentaLimitadaItemCreate[];
  metadata?: Record<string, any>;
}

export interface VentaLimitadaUpdate {
  nombre?: string | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  items?: VentaLimitadaItemUpdate[] | null;
  metadata?: Record<string, any> | null;
  estado?: EventState | null;
}

export interface BaseEvent {
  id: number;
  usuario_id: number;
  nombre: string;
  tipo: EventType;
  estado: EventState;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  metadata: Record<string, any> | null;
  created_at: string | null;
}
export interface RifaOut extends BaseEvent {
  tipo: "rifa";
  numero_inicio: number;
  numero_fin: number;
  numeros_reservados: number[];
}
export interface SubastaItemOut {
  nombre: string;
  precio_maximo: number;
}

export interface SubastaOut extends BaseEvent {
  tipo: "subasta";
  items: SubastaItemOut[];
}
export interface VentaLimitadaItemOut {
  nombre: string;
  precio: number;
  n_cantidad_maxima: number;
}

export interface VentaLimitadaOut extends BaseEvent {
  tipo: "venta_limitada";
  items: VentaLimitadaItemOut[];
}
export type EventFullOut = RifaOut | SubastaOut | VentaLimitadaOut;
