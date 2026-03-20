from enum import Enum
import threading
from typing import TypeVar,Type

T = TypeVar("T")

class Lifetime(Enum):
    SINGLETON = "singleton"
    TRANSIENT = "transient"

class ServiceContainer:
    def __init__(self):
        self._services = {}
        self._singletons = {}
        self._lock = threading.Lock()

    def register(self, key, factory, lifetime=Lifetime.SINGLETON):
        self._services[key] = {
            "factory": factory,
            "lifetime": lifetime
        }

    def resolve(self, key: Type[T]) -> T:
        service = self._services[key]

        if service["lifetime"] == Lifetime.TRANSIENT:
            return service["factory"]()

        if service["lifetime"] == Lifetime.SINGLETON:
            with self._lock:
                if key not in self._singletons:
                    self._singletons[key] = service["factory"]()
                return self._singletons[key]
