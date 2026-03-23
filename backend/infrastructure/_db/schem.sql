ALTER DATABASE railway SET timezone TO 'America/Lima';

CREATE TABLE "User" (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password CHAR(60) NOT NULL,
    correo VARCHAR(254) UNIQUE,
    estado BOOLEAN DEFAULT FALSE,
    codigo INTEGER NULL,
    permissions TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

----------------------------------------------------------------------------------------------------------
CREATE TYPE event_type AS ENUM ('rifa', 'subasta', 'venta_limitada');
CREATE TYPE event_state AS ENUM ('Proximo', 'En_curso', 'Finalizado');

CREATE TABLE Event (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    tipo event_type NOT NULL,
    estado event_state DEFAULT 'Proximo',
    usuario_id INT REFERENCES "User"(id) ON DELETE CASCADE,
    fecha_inicio TIMESTAMP,
    fecha_fin TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_nombre_por_usuario UNIQUE (nombre, usuario_id)
);

CREATE TABLE EventAudit (
    id SERIAL PRIMARY KEY,
    event_id INT REFERENCES Event(id) ON DELETE CASCADE,
    usuario_id INT REFERENCES "User"(id),
    accion VARCHAR(10) NOT NULL CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE')),
    cambios JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION audit_event_changes() RETURNS TRIGGER AS $$
DECLARE
    cambios JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        cambios := to_jsonb(NEW);
        INSERT INTO EventAudit(event_id, usuario_id, accion, cambios)
        VALUES (NEW.id, NEW.usuario_id, 'INSERT', cambios);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        cambios := (
            SELECT jsonb_object_agg(key, value)
            FROM (
                SELECT n.key, n.value
                FROM jsonb_each_text(to_jsonb(NEW)) AS n
                JOIN jsonb_each_text(to_jsonb(OLD)) AS o
                ON n.key = o.key
                WHERE n.value IS DISTINCT FROM o.value
            ) AS diff
        );

        IF cambios IS NULL THEN
            RETURN NEW;
        END IF;

        INSERT INTO EventAudit(event_id, usuario_id, accion, cambios)
        VALUES (NEW.id, NEW.usuario_id, 'UPDATE', cambios);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        cambios := to_jsonb(OLD);
        INSERT INTO EventAudit(event_id, usuario_id, accion, cambios)
        VALUES (OLD.id, OLD.usuario_id, 'DELETE', cambios);
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_event_audit
AFTER INSERT OR UPDATE OR DELETE ON Event
FOR EACH ROW EXECUTE FUNCTION audit_event_changes();
----------------------------------------------------------------------------------------------------------
