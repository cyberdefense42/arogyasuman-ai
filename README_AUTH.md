# Firebase Authentication Setup Guide

## Frontend Setup

The authentication system has been implemented with the following features:

1. **Email/Password Authentication**
2. **Social Login** (Google, Facebook, Twitter)
3. **Password Reset**
4. **Protected Routes**
5. **User Context Management**

### Key Components:

- `/frontend/lib/firebase.ts` - Firebase configuration
- `/frontend/contexts/AuthContext.tsx` - Authentication context provider
- `/frontend/components/auth/LoginForm.tsx` - Login/Register UI
- `/frontend/components/auth/ProtectedRoute.tsx` - Route protection wrapper
- `/frontend/app/login/page.tsx` - Login page
- `/frontend/app/dashboard/page.tsx` - Protected dashboard

## Backend Setup

The backend has been configured to verify Firebase ID tokens:

- `/backend/auth_utils.py` - Firebase Admin SDK integration
- `/backend/main.py` - Protected API endpoints

## Configuration Steps

### 1. Firebase Console Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Navigate to your project: `healthcareapp-2c27b`
3. Go to **Authentication** → **Sign-in method**
4. Enable the following providers:
   - Email/Password
   - Google
   - Facebook (requires Facebook App ID & Secret)
   - Twitter (requires Twitter API Key & Secret)

### 2. Social Provider Configuration

#### Google:
- Already configured by default in Firebase

#### Facebook:
1. Create a Facebook App at [developers.facebook.com](https://developers.facebook.com)
2. Add Facebook Login product
3. Copy App ID and App Secret to Firebase Console

#### Twitter:
1. Create a Twitter App at [developer.twitter.com](https://developer.twitter.com)
2. Enable OAuth 1.0a
3. Copy API Key and API Secret to Firebase Console

### 3. Backend Firebase Admin Setup

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save the JSON file as `firebase-admin-key.json` in the backend directory
4. Add to `.gitignore`: `firebase-admin-key.json`

### 4. Environment Variables

Backend `.env` file:
```
FIREBASE_ADMIN_CREDENTIALS=firebase-admin-key.json
```

## Running the Application

1. Start the backend:
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

2. Start the frontend:
```bash
cd frontend
npm install
npm run dev
```

3. Access the application at `http://localhost:3000`

## API Authentication

All protected API endpoints require the Firebase ID token in the Authorization header:

```javascript
Authorization: Bearer <firebase-id-token>
```

The frontend `fetchWithAuth` function in `/frontend/lib/api.ts` handles this automatically.

## Security Notes

1. Never commit `firebase-admin-key.json` to version control
2. Keep your Firebase configuration keys secure
3. Enable only the authentication methods you need
4. Configure authorized domains in Firebase Console
5. Set up proper CORS origins in production