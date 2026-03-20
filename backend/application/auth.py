import random
import os
from datetime import datetime, timezone
from fastapi import (
    APIRouter, Depends, Request, Response, HTTPException, status, Header, WebSocket
)
from fastapi.security import OAuth2PasswordRequestForm

from domain.auth import UserResponse, UserCokie, CreateUser, CreateUserDb
from service_container import ServiceContainer
from infrastructure.rep_auth import JWTManagerImpl, BcryptMnjCrypt, UserService
from application.mnj_ws import WebSocketManager

class AuthRouter:
    """
    Router de autenticación con manejo de JWT, cookies y permisos.
    """

    def __init__(self, serv_container: ServiceContainer):
        self.serv_container = serv_container
        self.key_token = "AccessToken" + os.getenv('NAME_PROYECT')
        self.token_renew_threshold = 300  # segundos antes de expirar para renovar token
        self.token_max_age = 900          # 15 minutos
        self.secure = False               # cambiar a True en producción HTTPS

        # -------------------------
        # Instanciar servicios una sola vez
        # -------------------------
        self.jwt_manager: JWTManagerImpl = serv_container.resolve(JWTManagerImpl)
        self.crypt_manager: BcryptMnjCrypt = serv_container.resolve(BcryptMnjCrypt)
        self.user_service: UserService = serv_container.resolve(UserService)

        # -------------------------
        # Crear router de FastAPI
        # -------------------------
        self.router = APIRouter(tags=["auth"], prefix="/auth")
        self._init_routes()

    # -------------------------
    # Definición de rutas
    # -------------------------
    def _init_routes(self): 
        """Define las rutas principales del router de autenticación."""
         
        @self.router.get("/me", response_model=UserResponse)
        async def me_route(current_user=Depends(self.get_current_user)): 
            """ Endpoint para obtener información del usuario actual. Uso: GET /auth/me """ 
            return await self.me(current_user) 
        
        @self.router.post("/token", response_model=UserResponse)
        async def token_route( response: Response, form_data: OAuth2PasswordRequestForm = Depends() ): 
            """ Endpoint de login: autentica usuario y genera JWT en cookie HTTP-only. Uso: POST /auth/token Body: form-data con 'username' y 'password' """ 
            return await self.token(response, form_data)
        
        @self.router.post("/logout")
        async def logout_route(response: Response): 
            """ Endpoint de logout: elimina cookie de acceso. Uso: POST /auth/logout """ 
            return await self.logout(response)
        
        @self.router.get("/show-ws-data")
        async def show_ws_data(x_api_key:str =Depends(self.api_key_required())):
            return await WebSocketManager().get_all_data()

        @self.router.post("/create-user",status_code=201)
        async def create_user(
            new_user:CreateUser,
        ):
            user_data = new_user.model_dump()
            
            cod = random.randint(1000, 9999)
            hash_cod = self.crypt_manager.hash_password(str(cod))
            user_data['cod'] = cod
            user_data['hash_cod'] = hash_cod
            new_user_db = CreateUserDb.model_validate(user_data)
            new_user_db.password = self.crypt_manager.hash_password(new_user_db.password)
            
            await self.user_service.register_new_user(new_user_db)
        
        @self.router.get("/activate-account")
        async def activate_account(email: str, hash_code: str):
            result = await self.user_service.activate_account(email, hash_code, self.crypt_manager)
            if result:
                # TODO: MEJORAR LA RESPUESTA POR UN MEJOR HTML
                return {"success": True, "message": "Cuenta activada correctamente"}
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No se pudo activar la cuenta"
                )

    # -------------------------
    # Manejo de cookies
    # -------------------------
    def _set_access_cookie(self, response: Response, token: str):
        response.set_cookie(
            key=self.key_token,
            value=token,
            httponly=True,
            max_age=self.token_max_age,
            secure=self.secure,
            samesite="none" if self.secure else "Lax"
        )

    def _delete_access_cookie(self, response: Response):
        response.delete_cookie(
            key=self.key_token,
            secure=self.secure,
            samesite="none" if self.secure else "Lax"
        )

    # -------------------------
    # Dependencias
    # -------------------------
    async def get_current_user(self, request: Request, response: Response) -> UserCokie:
        token = request.cookies.get(self.key_token)
        if not token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="No se encontró token de autenticación")
        try:
            payload = self.jwt_manager.verify_token(token)
            exp_timestamp = payload.get("exp")
            user_cokie = UserCokie.model_validate(payload)

            if exp_timestamp:
                now = datetime.now(timezone.utc).timestamp()
                if exp_timestamp - now < self.token_renew_threshold:
                    # Renovar token si está próximo a expirar
                    new_token = self.jwt_manager.create_access_token(data=user_cokie)
                    self._set_access_cookie(response, new_token)

            return user_cokie
        except Exception:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="Token inválido o expirado")

    # -------------------------
    # Endpoints lógicos
    # -------------------------
    async def me(self, current_user: UserCokie) -> UserResponse:
        return UserResponse(**current_user.model_dump())

    async def token(self, response: Response, form_data: OAuth2PasswordRequestForm) -> UserResponse:
        user = await self.user_service.get_user(form_data.username)
        if not user or not self.crypt_manager.verify_password(form_data.password, user.password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

        access_token = self.jwt_manager.create_access_token(data=UserCokie(**user.model_dump()))
        self._set_access_cookie(response, access_token)
        return UserResponse(**user.model_dump())
    
    def permission_required(self, permission: str):
        """
        Crea dependencia que valida permisos de usuario.

        Args:
            permission (str): Permiso requerido.

        Returns:
            Callable: Dependencia para usar en rutas.

        Uso:
            @router.get("/admin")
            async def admin_route(current_user=Depends(auth.permission_required("admin"))):
                ...
        """
        def dependency(current: UserCokie = Depends(self.get_current_user)):
            if permission not in current.permissions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permiso '{permission}' requerido"
                )
            return current
        return dependency
    
    def api_key_required(self):
        """
        Crea dependencia que valida API Key en headers.

        Returns:
            Callable: Dependencia para usar en rutas protegidas por API Key.

        Uso:
            @router.get("/external")
            async def external_route(api_key=Depends(auth.api_key_required())):
                ...
        """
        async def dependency(x_api_key: str = Header(..., alias="x-api-key")):
            if x_api_key != os.getenv("SUPER_API_KEY"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="API Key inválida o no autorizada"
                )
            return x_api_key
        return dependency
    
    async def logout(self, response: Response):
        self._delete_access_cookie(response)
        return {"detail": "Sesión cerrada"}

    async def validate_user_ws(self, ws: WebSocket) -> UserCokie | None:
        """
        Valida un usuario a través de WebSocket usando la cookie JWT.

        Args:
            ws (WebSocket): Conexión WebSocket.

        Returns:
            UserCokie | None: Usuario autenticado o None si inválido.
        """
        token = ws.cookies.get(self.key_token)
        if not token:
            return None
        try:
            payload = self.jwt_manager.verify_token(token)
            user = UserCokie(**payload)
            return user
        except Exception:
            return None

