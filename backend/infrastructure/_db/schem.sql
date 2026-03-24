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

CREATE TABLE Rifa (
    id SERIAL PRIMARY KEY,
    event_id INT REFERENCES Event(id) ON DELETE CASCADE,
    numero_inicio INT NOT NULL,
    numero_fin INT NOT NULL,
    numeros_reservados INT[] DEFAULT '{}',
    CHECK (numero_fin >= numero_inicio)
);

CREATE TABLE SubastaItem (
    id SERIAL PRIMARY KEY,
    subasta_id INT REFERENCES Event(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    precio_maximo NUMERIC(12,2) NOT NULL
);

CREATE TABLE VentaLimitadaItem (
    id SERIAL PRIMARY KEY,
    venta_limitada_id INT REFERENCES Event(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    precio NUMERIC(12,2) NOT NULL,
    n_cantidad_maxima INT NOT NULL,
    n_cantidad_vendida INT DEFAULT 0
);

CREATE TABLE EventAudit (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    event_id INT NOT NULL,
    operation CHAR(1) NOT NULL,
    changed_data JSONB NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE OR REPLACE FUNCTION audit_event_changes() RETURNS TRIGGER AS $$
DECLARE
    data JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        data := to_jsonb(NEW);
        INSERT INTO EventAudit(event_type, event_id, operation, changed_data)
        VALUES (TG_TABLE_NAME, NEW.id, 'I', data);

    ELSIF TG_OP = 'UPDATE' THEN
        data := jsonb_strip_nulls(to_jsonb(NEW) - to_jsonb(OLD));
        IF data <> '{}' THEN
            INSERT INTO EventAudit(event_type, event_id, operation, changed_data)
            VALUES (TG_TABLE_NAME, NEW.id, 'U', data);
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        data := to_jsonb(OLD);
        INSERT INTO EventAudit(event_type, event_id, operation, changed_data)
        VALUES (TG_TABLE_NAME, OLD.id, 'D', data);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_event
AFTER INSERT OR UPDATE OR DELETE ON Event
FOR EACH ROW
EXECUTE FUNCTION audit_event_changes();

CREATE TRIGGER trg_audit_rifa
AFTER INSERT OR UPDATE OR DELETE ON Rifa
FOR EACH ROW
EXECUTE FUNCTION audit_event_changes();

CREATE TRIGGER trg_audit_subasta
AFTER INSERT OR UPDATE OR DELETE ON SubastaItem
FOR EACH ROW
EXECUTE FUNCTION audit_event_changes();

CREATE TRIGGER trg_audit_venta
AFTER INSERT OR UPDATE OR DELETE ON VentaLimitadaItem
FOR EACH ROW
EXECUTE FUNCTION audit_event_changes();