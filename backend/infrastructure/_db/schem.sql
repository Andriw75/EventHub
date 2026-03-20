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

INSERT INTO "User" (username,password,correo,estado)
VALUES ('ING. AndriwDV','$2a$12$Vr.gWaUTcXh.1JZ8OhNmQux1qjzyA6gOML1hEmJMLWLOLhkpZyi9a','andriw7522@gmail.com',TRUE);
