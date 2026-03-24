export interface PersonEvents {
  id: number;
  nombre: string;
  tipo: string;
  estado: string;
  fecha_inicio: string;
  fecha_fin: string;
  metadata: Record<string, any>;
  usuario_id: number;
  created_at: string;
  updated_at: string;
}
