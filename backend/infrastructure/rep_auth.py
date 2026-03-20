import os
from datetime import timedelta,datetime,timezone

import jwt
from fastapi import HTTPException, status

from domain.auth import UserCokie

class JWTManagerImpl:
    def __init__(self):
        """
        Inicializa el gestor de JWT.
        :param secret_key: Clave secreta para firmar el token.
        :param algorithm: Algoritmo de encriptación (por defecto HS256).
        :param default_expires_minutes: Tiempo de expiración por defecto en minutos.
        """
        self.secret_key = os.getenv("SECRET_KEY")
        self.algorithm = os.getenv("ALGORITHM")
        self.default_expires_minutes = 15

    def create_access_token(self, data: UserCokie, expires_delta: timedelta|None = None) -> str:
        to_encode = data.model_dump(mode='json')
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=self.default_expires_minutes)
        to_encode.update({"exp": expire})
        token = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return token

    def verify_token(self, token: str) -> dict:
        """
        Verifica el token JWT y retorna la carga útil si es válido.
        :param token: Token JWT.
        :return: Payload del token.
        :raises HTTPException: Si el token es inválido o ha expirado.
        """
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="Token expirado")
        except jwt.PyJWTError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="Token inválido")

import bcrypt

class BcryptMnjCrypt:
        
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """
        Verifica si la contraseña en texto plano corresponde al hash utilizando bcrypt.

        :param plain_password: Contraseña en texto plano.
        :param hashed_password: Contraseña hasheada.
        :return: True si la contraseña es correcta, False en caso contrario.
        """
        try:
            return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
        except ValueError:
            return False
        
    def hash_password(self, plain_password: str) -> str:
        """
        Genera un hash seguro para la contraseña en texto plano usando bcrypt.

        :param plain_password: Contraseña en texto plano.
        :return: Contraseña hasheada como string.
        """
        # Genera un salt automáticamente y luego hashea la contraseña
        hashed = bcrypt.hashpw(plain_password.encode('utf-8'), bcrypt.gensalt())
        return hashed.decode('utf-8')

from domain.auth import UserDb, CreateUserDb
from asyncpg import Connection,UniqueViolationError
from infrastructure._db._db import PostgresDB
from infrastructure.send_email import send_email,verification_email_html

class UserService:
    def __init__(self):...

    async def get_user(self, user_name: str) -> UserDb | None:
        try:
            async with (await PostgresDB.acquire()) as conn:
                conn: Connection

                row = await conn.fetchrow(
                    """
                    SELECT 
                        id,
                        username AS name,
                        password,
                        permissions
                    FROM "User"
                    WHERE username = $1;
                    """,
                    user_name
                )

                if row is None:
                    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,)

                return UserDb.model_validate(dict(row))

        except HTTPException:
            raise
        
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    async def register_new_user(self, new_user: CreateUserDb):
        try:
            async with (await PostgresDB.acquire()) as conn:
                conn: Connection
                async with conn.transaction():
                    await conn.fetchrow(
                        """
                        INSERT INTO "User" (username,password,correo,estado,codigo)
                        VALUES ($1,$2,$3,FALSE,$4);
                        """,
                        new_user.name, new_user.password, new_user.correo, new_user.cod
                    )

                    verify_url = (
                        f"{os.getenv('URL_DESPLIEGUE')}/auth/activate-account?"
                        f"email={new_user.correo}&"
                        f"hash_code={new_user.hash_cod}"
                    )

                    html = verification_email_html(
                        username=new_user.name,
                        verify_url=verify_url
                    )

                    await send_email(
                        to=new_user.correo,
                        subject=f"Validación de cuenta - {os.getenv('NAME_PROYECT')}",
                        html=html
                    )
        except UniqueViolationError:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El username o el correo ya están registrados"
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    async def activate_account(self, correo: str, has_cod: str, rep_encrip: BcryptMnjCrypt):
        try:
            async with (await PostgresDB.acquire()) as conn:
                conn: Connection
                async with conn.transaction():
                    row = await conn.fetchrow(
                        'SELECT codigo FROM "User" WHERE correo=$1 AND estado=FALSE;', correo
                    )

                    if row is None:
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Usuario no encontrado o hash incorrecto."
                        )

                    if not rep_encrip.verify_password(str(row['codigo']), has_cod):
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Usuario no encontrado o hash incorrecto."
                        )

                    # Actualizamos el estado y eliminamos el código
                    await conn.execute(
                        """
                        UPDATE "User"
                        SET codigo=NULL, estado=TRUE
                        WHERE correo=$1;
                        """,
                        correo
                    )

                    return True
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

