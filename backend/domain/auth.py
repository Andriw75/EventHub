from pydantic import BaseModel

class UserResponse(BaseModel):
    name:str
    permissions:list[str] = []

class UserCokie(UserResponse):
    id:int
    
class UserDb(UserCokie):
    password:str
