'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function AuthTestPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Authentication Test</h1>
      
      {user ? (
        <div>
          <p className="mb-4">Logged in as: {user.email}</p>
          <p className="mb-4">Display Name: {user.displayName || 'Not set'}</p>
          <p className="mb-4">UID: {user.uid}</p>
          <Button onClick={() => logout().then(() => router.push('/login'))}>
            Logout
          </Button>
        </div>
      ) : (
        <div>
          <p className="mb-4">Not logged in</p>
          <Button onClick={() => router.push('/login')}>
            Go to Login
          </Button>
        </div>
      )}
    </div>
  );
}