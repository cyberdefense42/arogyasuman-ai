'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaGoogle, FaFacebook, FaTwitter } from 'react-icons/fa';

export default function LoginForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signUp, signIn, signInWithGoogle, signInWithFacebook, signInWithTwitter, resetPassword } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectUrl = searchParams.get('redirect') || '/dashboard';
  const errorParam = searchParams.get('error');

  // Show error messages from URL parameters
  useEffect(() => {
    if (errorParam === 'session-expired') {
      setError('Your session has expired. Please sign in again.');
    }
  }, [errorParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        await signUp(email, password, displayName);
      } else {
        await signIn(email, password);
      }
      router.push(redirectUrl);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'twitter') => {
    setError('');
    setLoading(true);

    try {
      switch (provider) {
        case 'google':
          await signInWithGoogle();
          break;
        case 'facebook':
          await signInWithFacebook();
          break;
        case 'twitter':
          await signInWithTwitter();
          break;
      }
      router.push(redirectUrl);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    try {
      await resetPassword(email);
      setError('Password reset email sent!');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <div className="bg-white rounded-lg shadow-xl p-8">
        <h2 className="text-2xl font-bold text-center mb-6">
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h2>

        {redirectUrl !== '/dashboard' && (
          <div className="mb-4 p-3 rounded bg-primary-50 text-primary-700 text-sm text-center">
            Sign in to continue to {redirectUrl === '/try-app' ? 'Try HealthScan AI' : redirectUrl}
          </div>
        )}

        {error && (
          <div className={`mb-4 p-3 rounded ${error.includes('sent') ? 'bg-healing-100 text-healing-700' : 'bg-alert-100 text-alert-700'}`}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <input
              type="text"
              placeholder="Full Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />

          {isSignUp && (
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-500 text-white py-2 rounded-lg hover:bg-primary-600 disabled:opacity-50"
          >
            {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        {!isSignUp && (
          <button
            onClick={handleForgotPassword}
            className="w-full text-sm text-primary-600 hover:underline mt-2"
          >
            Forgot Password?
          </button>
        )}

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <button
              onClick={() => handleSocialLogin('google')}
              disabled={loading}
              className="flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white hover:bg-primary-50"
            >
              <FaGoogle className="text-alert-500" />
            </button>

            <button
              onClick={() => handleSocialLogin('facebook')}
              disabled={loading}
              className="flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white hover:bg-primary-50"
            >
              <FaFacebook className="text-info-600" />
            </button>

            <button
              onClick={() => handleSocialLogin('twitter')}
              disabled={loading}
              className="flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white hover:bg-primary-50"
            >
              <FaTwitter className="text-info-400" />
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <span className="text-gray-600">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          </span>
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="ml-2 text-primary-600 hover:underline"
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}