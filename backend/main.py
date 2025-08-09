from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from auth_utils import get_current_user
from typing import Dict

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "HealthScan AI Backend API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/api/protected")
def protected_route(current_user: Dict = Depends(get_current_user)):
    return {
        "message": "This is a protected route",
        "user": current_user
    }

@app.get("/api/user/profile")
def get_user_profile(current_user: Dict = Depends(get_current_user)):
    return {
        "uid": current_user["uid"],
        "email": current_user["email"],
        "name": current_user["name"],
        "picture": current_user["picture"]
    }