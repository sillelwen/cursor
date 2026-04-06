"use client";

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [registrationType, setRegistrationType] = useState<'email' | 'phone'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const registerData = {
        name: formData.name,
        password: formData.password,
        ...(registrationType === 'email' 
          ? { email: formData.email }
          : { phone: formData.phone }
        ),
      };

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccess('Account created successfully! You can now sign in.');
      
      // Auto sign in after successful registration
      setTimeout(() => {
        if (registrationType === 'email') {
          signIn('credentials', {
            email: formData.email,
            password: formData.password,
            callbackUrl: '/editor',
          });
        } else {
          router.push('/auth/signin');
        }
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = () => {
    signIn('google', { callbackUrl: '/editor' });
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-gray-900 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Create Account</h1>
          <p className="mt-2 text-gray-400">Join PECS Builder today</p>
        </div>

        {error && (
          <div className="rounded bg-red-900/50 border border-red-500 p-3 text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded bg-green-900/50 border border-green-500 p-3 text-green-200">
            {success}
          </div>
        )}

        {/* Google Sign Up */}
        <Button
          onClick={handleGoogleSignUp}
          className="w-full bg-white text-black hover:bg-gray-100"
        >
          Continue with Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-gray-900 px-2 text-gray-400">Or create account with</span>
          </div>
        </div>

        {/* Registration Type Toggle */}
        <div className="flex rounded bg-gray-800 p-1">
          <button
            type="button"
            onClick={() => setRegistrationType('email')}
            className={`flex-1 rounded py-2 text-sm font-medium transition-colors ${
              registrationType === 'email'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Email
          </button>
          <button
            type="button"
            onClick={() => setRegistrationType('phone')}
            className={`flex-1 rounded py-2 text-sm font-medium transition-colors ${
              registrationType === 'phone'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Phone
          </button>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="name"
            placeholder="Full name"
            value={formData.name}
            onChange={handleInputChange}
            required
            className="w-full rounded bg-gray-800 px-3 py-2 text-gray-100 placeholder-gray-400"
          />

          {registrationType === 'email' ? (
            <input
              type="email"
              name="email"
              placeholder="Email address"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="w-full rounded bg-gray-800 px-3 py-2 text-gray-100 placeholder-gray-400"
            />
          ) : (
            <input
              type="tel"
              name="phone"
              placeholder="Phone number"
              value={formData.phone}
              onChange={handleInputChange}
              required
              className="w-full rounded bg-gray-800 px-3 py-2 text-gray-100 placeholder-gray-400"
            />
          )}

          <input
            type="password"
            name="password"
            placeholder="Password (min 6 characters)"
            value={formData.password}
            onChange={handleInputChange}
            required
            minLength={6}
            className="w-full rounded bg-gray-800 px-3 py-2 text-gray-100 placeholder-gray-400"
          />

          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm password"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            required
            className="w-full rounded bg-gray-800 px-3 py-2 text-gray-100 placeholder-gray-400"
          />

          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>

        <div className="text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link href="/auth/signin" className="text-blue-400 hover:text-blue-300">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
