import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os

# Initialize Firebase Admin SDK
cred_path = os.getenv('FIREBASE_ADMIN_CREDENTIALS', 'firebase-admin-key.json')
if os.path.exists(cred_path):
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
else:
    print("Warning: Firebase Admin credentials not found. Authentication will be disabled.")

security = HTTPBearer()

async def verify_firebase_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify Firebase ID token from the Authorization header"""
    try:
        token = credentials.credentials
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid authentication credentials: {str(e)}"
        )

def get_current_user(token_data: dict = Depends(verify_firebase_token)):
    """Get current user from Firebase token"""
    return {
        "uid": token_data.get("uid"),
        "email": token_data.get("email"),
        "name": token_data.get("name"),
        "picture": token_data.get("picture")
    }