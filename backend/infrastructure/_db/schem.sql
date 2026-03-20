ALTER DATABASE railway SET timezone TO 'America/Lima';

CREATE TABLE "User" (
    id SERIAL PRIMARY KEY,
    username VARCHAR(250) NOT NULL UNIQUE,
    password VARCHAR(250) NOT NULL,
    permissions TEXT [] NOT NULL DEFAULT '{}'
);

INSERT INTO "User" (username, password)
VALUES (
    'andriwdv',
    '$2a$12$JMs1p1czE2U1zwmHLtJjvuv4SCLmcNkOa6gejOlKP2Yo3ejLPZpeC'
);




