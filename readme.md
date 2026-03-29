# EventHub Backend

API REST + WebSockets construida con **FastAPI**, autenticación **JWT**, base de datos **PostgreSQL** y soporte para eventos de tipo Rifa, Subasta y Venta Limitada.

---

## Tabla de contenidos

- [Stack tecnológico](#stack-tecnológico)
- [Arquitectura](#arquitectura)
  - [Estructura de carpetas](#estructura-de-carpetas)
  - [Capas de la aplicación](#capas-de-la-aplicación)
  - [Diagrama de flujo general](#diagrama-de-flujo-general)
  - [Patrón Service Container (IoC)](#patrón-service-container-ioc)
  - [Singleton WebSocketManager](#singleton-websocketmanager)
- [Módulos principales](#módulos-principales)
  - [Autenticación (auth)](#autenticación-auth)
  - [Eventos (events)](#eventos-events)
  - [WebSocket Manager](#websocket-manager)
  - [Base de datos](#base-de-datos)
- [Flujo de autenticación](#flujo-de-autenticación)
- [Flujo WebSocket](#flujo-websocket)
- [Modelo de datos](#modelo-de-datos)
- [Variables de entorno](#variables-de-entorno)
- [Instalación y ejecución](#instalación-y-ejecución)
- [Endpoints disponibles](#endpoints-disponibles)
- [Futuras mejoras](#futuras-mejoras)

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework web | FastAPI |
| Base de datos | PostgreSQL (asyncpg) |
| Autenticación | JWT (PyJWT) + Bcrypt |
| WebSockets | FastAPI WebSocket nativo |
| Email | SMTP / Gmail |
| Validación | Pydantic v2 |
| Runtime async | Uvicorn |

---

## Arquitectura

### Estructura de carpetas

```
project/
│
├── main.py                     # Punto de entrada, registro de servicios y rutas
├── service_container.py        # Contenedor de IoC (Singleton / Transient)
│
├── domain/                     # Modelos de negocio (Pydantic)
│   ├── auth.py                 # UserResponse, UserCokie, CreateUser, etc.
│   └── events.py               # EventOut, RifaCreate, SubastaCreate, etc.
│
├── application/                # Capa de aplicación (routers, lógica de entrada)
│   ├── auth.py                 # AuthRouter: login, logout, /me, permisos
│   ├── eventsRW.py             # Router de eventos: CRUD + WebSocket handlers
│   └── mnj_ws.py               # WebSocketManager (Singleton)
│
└── infrastructure/             # Capa de infraestructura (BD, servicios externos)
    ├── rep_auth.py             # JWTManagerImpl, BcryptMnjCrypt, UserService
    ├── rep_events.py           # RepEvents: queries SQL para eventos
    ├── send_email.py           # Envío de correos por SMTP
    └── _db/
        └── _db.py              # PostgresDB: pool de conexiones asyncpg
```

---

### Capas de la aplicación

```
┌─────────────────────────────────────────────────────┐
│                    Cliente (HTTP / WS)               │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│              application/  (Routers)                 │
│   auth.py · eventsRW.py · mnj_ws.py                 │
│   • Reciben requests HTTP y mensajes WS              │
│   • Validan sesión (JWT en cookie)                   │
│   • Delegan lógica a infrastructure/                 │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│              domain/  (Modelos)                      │
│   auth.py · events.py                               │
│   • Pydantic models: validación y serialización      │
│   • Sin dependencias externas                        │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│           infrastructure/  (Repositorios)            │
│   rep_auth.py · rep_events.py · send_email.py       │
│   • Acceso a PostgreSQL vía asyncpg                  │
│   • Envío de correos SMTP                            │
│   • Encriptación y JWT                               │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│             PostgreSQL + SMTP (externos)             │
└─────────────────────────────────────────────────────┘
```

---

### Patrón Service Container (IoC)

`service_container.py` implementa un contenedor de inversión de control (IoC) ligero con soporte para dos ciclos de vida:

- **SINGLETON** (defecto): una sola instancia compartida durante toda la vida de la aplicación.
- **TRANSIENT**: nueva instancia en cada `resolve()`.

```python
container = ServiceContainer()
container.register(UserService, UserService)          # singleton
container.register(BcryptMnjCrypt, BcryptMnjCrypt)   # singleton

# Resolución con tipo seguro
user_service: UserService = container.resolve(UserService)
```

El registro ocurre en `main.py` al inicio, antes de montar los routers.

---

### Singleton WebSocketManager

`WebSocketManager` usa el patrón `__new__` para garantizar una única instancia global, lo que permite que tanto el endpoint `/ws` como los routers de eventos compartan el mismo estado de conexiones y canales.

```
WebSocketManager (Singleton)
├── connections: dict[connection_id, WebSocket]
├── channels: dict[channel_name, Set[connection_id]]
├── metadata: dict[connection_id, dict]
└── message_handlers: dict[event_name, handler_fn]
```

---

## Módulos principales

### Autenticación (auth)

**Archivo:** `application/auth.py`

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/token` | Login: valida credenciales y setea cookie JWT HTTP-only |
| GET | `/auth/me` | Devuelve datos del usuario autenticado |
| POST | `/auth/logout` | Elimina cookie de sesión |
| POST | `/auth/create-user` | Registro con envío de correo de activación |
| GET | `/auth/activate-account` | Activa cuenta via enlace con hash |
| GET | `/auth/show-ws-data` | Debug: estado del WebSocketManager (requiere API Key) |

**Token renewal automático:** si el token expira en menos de 300 segundos, se renueva silenciosamente en cada request autenticado.

**Dependencias reutilizables:**
- `auth.get_current_user` → valida cookie JWT y retorna `UserCokie`
- `auth.permission_required("admin")` → valida permisos específicos
- `auth.api_key_required()` → valida header `x-api-key`

---

### Eventos (events)

**Archivo:** `application/eventsRW.py`

Soporta tres tipos de eventos, cada uno con su propio schema de creación y actualización:

| Tipo | Tabla BD | Detalle especial |
|---|---|---|
| `rifa` | `Event` + `Rifa` | rango de números y números reservados |
| `subasta` | `Event` + `SubastaItem` | lista de ítems con precio máximo |
| `venta_limitada` | `Event` + `VentaLimitadaItem` | ítems con precio y cantidad máxima |

Los updates de Rifa emiten broadcast por WebSocket al canal `event_{id}`. La eliminación notifica a suscriptores antes de borrar.

---

### WebSocket Manager

**Archivo:** `application/mnj_ws.py`

El manager implementa un sistema de pub/sub basado en canales:

**Mensajes soportados (client → server):**

| Evento | Acción |
|---|---|
| `suscribe_event` | Suscribe la conexión al canal `event_{event_id}` y recibe datos actuales |
| `unsuscribe_event` | Desuscribe la conexión del canal |

**Emisiones del servidor:**

| Evento | Trigger |
|---|---|
| `event_data` | Al suscribirse o cuando el evento es actualizado |
| `event_deleted` | Cuando el evento es eliminado |
| `error` | Cuando hay un problema con la solicitud WS |

**Flujo de conexión:**
```
Cliente conecta → accept() → ID único (UUID) → datos iniciales (si registrados)
                                                          ↓
                          Cliente envía { event, data } → handler registrado
```

---

### Base de datos

**Archivo:** `infrastructure/_db/_db.py`

Pool de conexiones asíncrono con `asyncpg`. El pool es lazy (se crea en el primer uso) y se reutiliza en toda la aplicación.

```python
async with (await PostgresDB.acquire()) as conn:
    row = await conn.fetchrow("SELECT * FROM Event WHERE id=$1", event_id)
```

Tamaño del pool: mínimo 1, máximo 10 conexiones.

---

## Flujo de autenticación

```
1. POST /auth/token  { username, password }
         │
         ▼
   Valida en BD (UserService.get_user)
         │
         ▼
   Verifica password con Bcrypt
         │
         ▼
   Genera JWT (15 min, HS256)
         │
         ▼
   Setea cookie HTTP-only "AccessToken{PROJECT_NAME}"
         │
         ▼
   Responde con UserResponse

2. Requests autenticados
         │
         ▼
   get_current_user lee cookie → verifica JWT → renueva si expira pronto
         │
         ▼
   Retorna UserCokie { id, name, permissions }
```

---

## Flujo WebSocket

```
Cliente abre ws://host/ws
        │
        ▼
  manager.connect() → UUID asignado
        │
        ▼
  Loop: websocket.receive_json()
        │
        ├── { event: "suscribe_event", data: { event_id: 5 } }
        │         └── subscribe(conn_id, "event_5")
        │             → send_json({ event: "event_data", data: {...} })
        │
        └── { event: "unsuscribe_event", data: { event_id: 5 } }
                  └── unsubscribe(conn_id, "event_5")

  PUT /events/rifa/5 (HTTP)
        │
        ▼
  broadcast_channel("event_5", { event: "event_data", data: {...} })
        │
        ▼
  Todos los suscriptores reciben la actualización en tiempo real
```

---

## Modelo de datos

```
User
├── id (PK)
├── username
├── password (bcrypt)
├── correo
├── estado (bool)
├── codigo (int, nullable)
└── permissions (array)

Event
├── id (PK)
├── usuario_id (FK → User)
├── nombre
├── tipo (rifa | subasta | venta_limitada)
├── estado (Proximo | En_curso | Finalizado)
├── fecha_inicio
├── fecha_fin
├── metadata (JSONB)
├── created_at
└── updated_at

Rifa (event_id FK → Event)
├── numero_inicio
├── numero_fin
└── numeros_reservados (array)

SubastaItem (subasta_id FK → Event)
├── nombre
└── precio_maximo

VentaLimitadaItem (venta_limitada_id FK → Event)
├── nombre
├── precio
└── n_cantidad_maxima
```

---

## Variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# App
NAME_PROYECT=EventHub
URL_DESPLIEGUE=http://localhost:8000

# Base de datos
USER_POSTGRES=postgres
PASSWORD_POSTGRES=password
DB_POSTGRES=eventhub
HOST_POSTGRES=localhost
PORT_POSTGRES=5432

# JWT
SECRET_KEY=tu_clave_secreta_muy_larga
ALGORITHM=HS256

# Email (Gmail)
FROM_EMAIL=tu@gmail.com
PASSWORD_GMAIL=app_password_gmail

# API Key para endpoints internos
SUPER_API_KEY=una_api_key_segura
```

---

## Instalación y ejecución

```bash
# 1. Clonar el repositorio
git clone <repo-url>
cd eventhub-backend

# 2. Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. Instalar dependencias
pip install fastapi uvicorn asyncpg pyjwt bcrypt python-dotenv pydantic

# 4. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# 5. Ejecutar
python main.py
# o
uvicorn main:app --reload

# Docs interactivas
# http://localhost:8000/docs
```

---

## Endpoints disponibles

### Auth

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/auth/token` | ❌ | Login |
| GET | `/auth/me` | ✅ Cookie | Perfil del usuario |
| POST | `/auth/logout` | ❌ | Cerrar sesión |
| POST | `/auth/create-user` | ❌ | Registro |
| GET | `/auth/activate-account` | ❌ | Activar cuenta |
| GET | `/auth/show-ws-data` | 🔑 API Key | Debug WS |

### Eventos

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/events/` | ❌ | Listar eventos por usuario |
| GET | `/events/count` | ❌ | Contar eventos |
| GET | `/events/by-type` | ✅ | Listar eventos propios por tipo (full) |
| GET | `/events/by-type-count` | ✅ | Contar eventos propios por tipo |
| POST | `/events/rifa` | ✅ | Crear rifa |
| POST | `/events/subasta` | ✅ | Crear subasta |
| POST | `/events/venta-limitada` | ✅ | Crear venta limitada |
| PUT | `/events/rifa/{id}` | ✅ | Actualizar rifa + broadcast WS |
| PUT | `/events/subasta/{id}` | ✅ | Actualizar subasta |
| PUT | `/events/venta-limitada/{id}` | ✅ | Actualizar venta limitada |
| DELETE | `/events/{id}` | ✅ | Eliminar evento + notificación WS |

### WebSocket

| Ruta | Descripción |
|---|---|
| `ws://host/ws` | Conexión en tiempo real |

---

## Futuras mejoras

### 🔐 Seguridad

- [ ] **Refresh tokens**: implementar tokens de refresco de larga duración separados del access token, almacenados en BD, para poder revocarlos explícitamente.
- [ ] **Rotación de secretos**: soporte para múltiples `SECRET_KEY` activas durante rotaciones sin invalidar sesiones activas.
- [ ] **Autenticación WS**: actualmente el WS no valida JWT al conectarse. Agregar `validate_user_ws()` (ya implementado en `AuthRouter`) al flujo de conexión en `main.py`.

### 🏗️ Arquitectura

- [ ] **Repositorios abstractos**: definir interfaces (`Protocol` o ABC) para `RepEvents` y `UserService` para facilitar mocking en tests y cambio de BD.
- [ ] **Migraciones de BD**: incorporar `alembic` para gestionar cambios de esquema de forma controlada y reproducible.
- [ ] **Inyección de dependencias nativa de FastAPI**: evaluar reemplazar el `ServiceContainer` custom por `Depends()` de FastAPI para integración más idiomática.

### ⚡ Rendimiento

- [ ] **Caché de eventos**: cachear resultados de `get_event_full_by_id` con Redis para reducir queries repetidas durante transmisiones en vivo.
- [ ] **Paginación con cursor**: reemplazar paginación por offset (lenta en tablas grandes) por paginación basada en cursor (`created_at + id`).
- [ ] **Bulk inserts**: en creación de items de subastas y ventas limitadas, usar `conn.executemany()` en lugar de un loop de `conn.execute()`.
- [ ] **Pool sizing dinámico**: exponer configuración del pool (min/max) vía variables de entorno.

### 📡 WebSockets

- [ ] **Presencia en canales**: emitir al canal la lista de usuarios conectados cuando alguien entra o sale.
- [ ] **Heartbeat / ping-pong**: detectar conexiones zombies con un ping periódico y limpiar el estado sin esperar a un error de envío.
- [ ] **Reconexión automática con estado**: permitir que el cliente reconecte y reciba el último estado sin re-suscribirse manualmente.
- [ ] **Escalabilidad horizontal con Redis Pub/Sub**: el `WebSocketManager` singleton solo funciona en un proceso. Para múltiples instancias (workers), usar Redis como bus de mensajes.

### 🧪 Testing

- [ ] **Tests unitarios**: cubrir validaciones de dominio (`domain/auth.py`, `domain/events.py`) y lógica de negocio.
- [ ] **Tests de integración**: usar `httpx.AsyncClient` con BD de prueba para cubrir flujos completos (registro → activación → login → CRUD).
- [ ] **Tests de WebSocket**: validar handlers de mensajes con conexiones simuladas.
- [ ] **Cobertura mínima**: configurar CI con umbral de cobertura (ej. 80%).

### 📬 Email

- [ ] **Cola de emails**: mover el envío de correos a una cola asíncrona (Celery + Redis o ARQ) para no bloquear la transacción de registro si el SMTP falla.
- [ ] **Plantillas externas**: usar un motor de templates (Jinja2) para los HTMLs de correo en lugar de f-strings embebidos en el código.
- [ ] **Reintentos automáticos**: implementar lógica de retry con backoff exponencial para fallos de SMTP.

### 🗂️ Eventos

- [ ] **Estado automático por tiempo**: un job periódico (APScheduler o un worker) que cambie el estado de `Proximo` a `En_curso` y `Finalizado` según `fecha_inicio` y `fecha_fin`.
- [ ] **Historial de cambios**: tabla de auditoría que registre cada modificación de un evento (quién, cuándo, qué cambió).
- [ ] **Participantes en eventos**: modelo de participación de usuarios en rifas/subastas con validaciones de negocio específicas por tipo.
- [ ] **Imágenes para eventos**: soporte para subir y servir imágenes asociadas a cada evento (S3, Cloudflare R2, etc.).

### 📦 DevOps

- [ ] **Dockerfile + docker-compose**: contenedores para la API y PostgreSQL listos para desarrollo y producción.
- [ ] **Health check endpoint**: `GET /health` que valide conectividad con la BD y devuelva el estado del servicio.
- [ ] **Logging estructurado**: reemplazar `print()` por un logger con formato JSON (compatible con sistemas como Datadog o Loki).
- [ ] **Variables de entorno tipadas**: usar `pydantic-settings` para parsear y validar el `.env` al arrancar.



# EventHub — Frontend

Aplicación web para la gestión de eventos en tiempo real (rifas, subastas y ventas limitadas), construida con **SolidJS** y **Vite**.

---

## 📁 Arquitectura del Proyecto

El proyecto sigue una arquitectura en capas inspirada en los principios de **Clean Architecture**, separando claramente las responsabilidades entre dominio, infraestructura y presentación.

```
src/
├── domain/           # Tipos, interfaces y contratos del negocio
├── infrastructure/   # Comunicación con la API REST
├── app/
│   ├── context/      # Estado global reactivo (Auth, WebSocket, Evento seleccionado)
│   ├── Pages/        # Páginas enrutadas (Login, Dashboard, PersonHome, EventDetails)
│   ├── PagesDash/    # Vistas del dashboard por tipo de evento (Rifas, Subasta, VentaLimitada)
│   ├── common/
│   │   ├── components/   # Componentes reutilizables (FloatingInput, Pagination, KVList)
│   │   ├── IconSVG/      # Íconos SVG como componentes SolidJS
│   │   └── UI/           # Elementos de UI globales (Modal, Toast, Confirm)
├── App.tsx           # Declaración de rutas
└── index.tsx         # Punto de entrada y providers
```

### Capas

| Capa | Responsabilidad |
|---|---|
| **Domain** | Define los tipos y contratos del negocio (`PersonEvents`, `RifaOut`, `EventState`, etc.) |
| **Infrastructure** | Realiza llamadas HTTP a la API usando `fetch` con credenciales. Retorna `ApiResponse<T>` tipado |
| **Context** | Gestiona el estado global: sesión de usuario (`AuthContext`), conexión WebSocket (`WebSocketContext`) y evento seleccionado |
| **Pages** | Componentes de página enrutados, compuestos de secciones más pequeñas |
| **PagesDash** | Módulos de gestión por tipo de evento, con sus propios formularios CRUD |
| **Common** | Componentes agnósticos al negocio, completamente reutilizables |

---

## 🔀 Flujo de Enrutamiento

```
/                          → Redirige a /login
/login                     → Login
/create-account            → Registro
/:person                   → PersonHome (listado público de eventos de un usuario)
/:person/dashboard         → DashboardLayout (panel de administración)
/:person/dashboard/events/rifas
/:person/dashboard/events/subasta
/:person/dashboard/events/venta-limitada
/:person/:event            → EventDetails (detalle en tiempo real vía WebSocket)
```

---

## ⚡ Funcionalidades Principales

### Autenticación
- Login y registro con validación de campos en tiempo real.
- Sesión persistida mediante cookies HTTP-only (manejo delegado al backend).
- Guard de ruta en `onMount` del `DashboardLayout`.

### Gestión de Eventos (Dashboard)
- CRUD completo de **Rifas**, con selector visual de números reservados.
- Soporte para **Subasta** y **Venta Limitada** (estructura preparada).
- Detección de cambios campo a campo al editar: solo se envían al backend los campos modificados.
- Botón "Ver originales" con preview al hover antes de restaurar valores.
- Metadatos dinámicos mediante un editor de clave-valor con soporte de drag & drop (`KVList`).
- Filtros de búsqueda por rango de fecha (hoy / semana / mes / personalizado).

### Tiempo Real (WebSocket)
- Contexto global de WebSocket con gestión del ciclo de vida (connect / disconnect).
- Sistema de suscripción por listeners: cada componente se registra y se limpia al desmontar.
- `EventDetails` se suscribe al evento seleccionado y muestra datos actualizados en tiempo real.

### UI / UX
- **Toast notifications** globales (éxito / error / info) con auto-desaparición.
- **Confirm dialog** genérico y asíncrono basado en Promises, reutilizable desde cualquier parte de la app.
- **ModalCommon** con animaciones de entrada/salida y control de cierre por overlay.
- **Pagination** avanzada con combo de búsqueda por número de página y elipsis dinámicos.
- **FloatingInput** con label animado tipo Material Design.
- CSS Modules en todos los componentes para encapsulamiento total de estilos.
- Sidebar colapsable con soporte responsive y menú recursivo basado en configuración (`MenuItem.ts`).

---

## ✅ Aciertos del Diseño

### 1. `ApiResponse<T>` como tipo discriminado
Todas las llamadas HTTP retornan `{ data: T; error: null } | { data: null; error: ApiError }`, lo que obliga al código consumidor a manejar explícitamente el caso de error, eliminando excepciones no controladas.

### 2. Detección de cambios granular en formularios
`ModCURifa` compara campo por campo el estado actual contra los valores originales. El payload de `PUT` solo incluye los campos que realmente cambiaron, reduciendo el riesgo de sobrescrituras accidentales y el volumen de datos enviados.

### 3. Sistema de confirmación basado en Promises
`confirm(title, message, fn)` devuelve una `Promise` que resuelve con el resultado de la operación o `null` si el usuario cancela. Permite flujos como `const result = await confirm(...)` sin callbacks anidados.

### 4. WebSocket con listeners desacoplados
`addMessageListener` devuelve una función de limpieza, siguiendo el patrón estándar de SolidJS (`onCleanup`). Cada componente gestiona su propio ciclo de vida sin acoplar el contexto global.

### 5. Menú de navegación declarativo
El array `menu` en `MenuItem.ts` define la estructura completa de la navegación (ícono, ruta, permisos, submenús). El componente `Sidebar` lo renderiza recursivamente, facilitando agregar nuevas secciones sin tocar JSX.

### 6. Sidebar con control de permisos
`filterMenuByPermissions` filtra recursivamente los ítems del menú según los permisos del usuario autenticado, permitiendo un control de acceso a nivel de navegación declarativo.

---

## 🔧 Mejoras Futuras

### Alta prioridad

| Mejora | Descripción |
|---|---|
| **Tests unitarios y de integración** | No existe cobertura de tests. Agregar pruebas con Vitest para la lógica de dominio, transformaciones de datos y componentes clave. |
| **Reconexión automática de WebSocket** | Si la conexión se cierra inesperadamente, no hay lógica de retry con backoff exponencial. |
| **Error boundaries** | Ninguna página tiene manejo de errores de renderizado. Un componente `<ErrorBoundary>` de SolidJS evitaría pantallas en blanco. |
| **Guard de rutas declarativo** | La protección de rutas se hace con `onMount` + `navigate`. Centralizar esto en un componente `<ProtectedRoute>` reduciría duplicación. |

### Media prioridad

| Mejora | Descripción |
|---|---|
| **Subasta y Venta Limitada** | Las páginas del dashboard solo muestran placeholders. Implementar sus formularios CRUD siguiendo el patrón de `ModCURifa`. |
| **`selectedEvent` como contexto reactivo** | Actualmente usa signals a nivel de módulo (singleton). Moverlo a un `Context` formal haría el flujo más predecible y testeable. |
| **Paginación en el Dashboard** | `Rifas.tsx` carga todos los resultados del rango seleccionado sin paginación del lado del cliente. Con muchos eventos, esto puede ser costoso. |
| **Variables de entorno documentadas** | Agregar un archivo `.env.example` con `VITE_API_URL` y `VITE_CONEX_WS` documentados. |
| **Feedback de error en formularios CRUD** | Los errores del backend (`response.error`) en create/update de rifas se registran en consola pero no se muestran al usuario. |

### Baja prioridad

| Mejora | Descripción |
|---|---|
| **Internacionalización (i18n)** | Todos los textos están en español hardcodeado. Preparar la app para múltiples idiomas con una librería como `@solid-primitives/i18n`. |
| **Modo oscuro** | Las variables CSS en `index.css` son un buen punto de partida; extender con un tema oscuro conmutable. |
| **Virtualización de listas largas** | El `NumberCircleSelector` renderiza todos los números del rango en el DOM. Para rangos grandes (ej. 1-1000) convendría virtualizar con `@tanstack/solid-virtual`. |
| **Optimistic updates** | Al crear/eliminar eventos, esperar la respuesta del servidor antes de actualizar la UI. Aplicar actualizaciones optimistas mejoraría la percepción de velocidad. |
| **Accesibilidad (a11y)** | Revisar roles ARIA, navegación por teclado en el sidebar y los modales, y contraste de color en estados deshabilitados. |

---

## 🛠️ Stack Tecnológico

| Tecnología | Uso |
|---|---|
| [SolidJS](https://www.solidjs.com/) | Framework reactivo principal |
| [Vite](https://vitejs.dev/) | Bundler y servidor de desarrollo |
| [@solidjs/router](https://github.com/solidjs/solid-router) | Enrutamiento SPA |
| CSS Modules | Estilos encapsulados por componente |
| WebSocket nativo | Comunicación en tiempo real |
| Fetch API | Comunicación con la API REST |

---

## 🚀 Instalación y Desarrollo

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tu VITE_API_URL y VITE_CONEX_WS

# Iniciar servidor de desarrollo
npm run dev

# Build de producción
npm run build
```

---

## 📄 Variables de Entorno

```env
VITE_API_URL=http://localhost:8000    # URL base de la API REST
VITE_CONEX_WS=ws://localhost:8000/ws # URL del WebSocket
```