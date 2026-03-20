import os
from dotenv import load_dotenv
load_dotenv()

########################################
# REGISTRAMOS SERVICIOS
########################################
from service_container import ServiceContainer
from infrastructure.rep_auth import JWTManagerImpl, BcryptMnjCrypt, UserService

container = ServiceContainer()
container.register(UserService,UserService,)
container.register(BcryptMnjCrypt,BcryptMnjCrypt)
container.register(JWTManagerImpl,JWTManagerImpl)

# ########################################
# # INICIAMOS LA APP
# ########################################
from fastapi import FastAPI, WebSocket
from application.mnj_ws import WebSocketManager

app = FastAPI(
    debug=True,
    title=os.getenv('NAME_PROYECT'),
)

manager = WebSocketManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    
    connection_id = await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            await manager.handle_message(connection_id, data)
    except Exception as e:
        print("---WS---")
        print(e)
        print("--------")
    finally:
        await manager.disconnect(connection_id)

# ########################################
# # IMPLEMENTAMOS RAUTERS
# ########################################
from application.auth import AuthRouter
instance_auth = AuthRouter(container)
app.include_router(instance_auth.router)

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app)