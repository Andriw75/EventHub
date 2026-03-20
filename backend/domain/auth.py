from pydantic import BaseModel,field_validator

class UserResponse(BaseModel):
    name:str
    permissions:list[str] = []

class UserCokie(UserResponse):
    id:int
    
class UserDb(UserCokie):
    password:str

import re

class CreateUser(BaseModel):
    correo:str
    name:str
    password:str
    
    @field_validator('name')
    @classmethod
    def validate_user(cls, value):
        if len(value) >= 50:
            raise ValueError('El usuario debe tener menos de 50 caracteres')
        return value

    @field_validator('password')
    @classmethod
    def validate_password(cls, value):
        if len(value) < 6:
            raise ValueError('La contraseña debe tener al menos 6 caracteres')

        if len(value) >= 50:
            raise ValueError('La contraseña debe tener menos de 50 caracteres')
        
        if not re.search(r'[A-Z]', value):
            raise ValueError('La contraseña debe contener al menos una letra mayúscula')
        
        if not re.search(r'[a-z]', value):
            raise ValueError('La contraseña debe contener al menos una letra minúscula')
        
        if not re.search(r'\d', value):
            raise ValueError('La contraseña debe contener al menos un número')
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', value):
            raise ValueError('La contraseña debe contener al menos un símbolo especial')

        return value

class CreateUserDb(BaseModel):
    correo:str
    name:str
    password:str
    
    cod:int
    hash_cod:str

