import os
import asyncpg
from contextlib import asynccontextmanager

class PostgresDB:
    _pool = None

    @classmethod
    async def get_pool(cls):
        """
        Obtiene o crea el pool de conexiones a la base de datos Postgres.

        Uso:
            pool = await PostgresDB.get_pool()
        
        Retorno:
            asyncpg.pool.Pool: El pool de conexiones.

        Nota:
            - Solo se crea un pool único por clase.
            - Maneja excepciones y retorna None si falla.
        """
        if cls._pool is None:
            try:
                cls._pool = await asyncpg.create_pool(
                    user=os.getenv('USER_POSTGRES'),
                    password=os.getenv('PASSWORD_POSTGRES'),
                    database=os.getenv('DB_POSTGRES'),
                    host=os.getenv('HOST_POSTGRES'),
                    port=int(os.getenv('PORT_POSTGRES')),
                    min_size=1,
                    max_size=10
                )
            except Exception as e:
                cls._pool = None
        return cls._pool

    @classmethod
    async def acquire(cls):
        """
        Context manager para adquirir una conexión del pool.

        Uso:
            async with (await PostgresDB.acquire()) as conn:
                # conn es una conexión asyncpg.Connection

        Ejemplo de operaciones:

        # ----------------------
        #  SELECT1
        # ----------------------
        # Obtener un solo registro como Record
        row = await conn.fetchrow("SELECT * FROM users WHERE id=$1", 1)
        if row:
            print(row['username'])  # acceso por clave
            print(row.username)     # acceso como atributo

        # Obtener múltiples registros como lista de Record
        rows = await conn.fetch("SELECT * FROM users")
        for r in rows:
            print(r.id, r.username)

        # Obtener un solo valor (ej: COUNT)
        count = await conn.fetchval("SELECT COUNT(*) FROM users")

        # Obtener una lista de valores de una columna
        usernames = [r['username'] for r in await conn.fetch("SELECT username FROM users")]

        # ----------------------
        # 2 INSERT / UPDATE / DELETE
        # ----------------------
        # Retorna una cadena como 'UPDATE 3' o 'DELETE 1'
        result = await conn.execute("UPDATE users SET username=$1 WHERE id=$2", "nuevo", 1)
        # Para True/False según filas afectadas:
        success = int(result.split()[-1]) > 0
        print(success)  # True si se modificó al menos una fila
        """
        pool = await cls.get_pool()
        if pool is None:
            print("CONEXION PERDIDA A LA BASE DE DATOS")
            raise Exception("SISTEMA EN MANTENIMIENTO")
        return pool.acquire()

    @classmethod
    @asynccontextmanager
    async def transaction(cls):
        pool = await cls.get_pool()
        if pool is None:
            raise Exception("No se pudo obtener el pool de conexiones")
        
        async with pool.acquire() as conn:
            async with conn.transaction():
                yield conn
