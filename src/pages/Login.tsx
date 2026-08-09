import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    const endpoint = isLogin ? '/auth/login' : '/auth/signup';

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (data.token) {
        login(data.token);
        navigate('/');
      } else if (isLogin) {
        setError(data.error || 'Invalid credentials');
      } else {
        // Signup succeeded but doesn't return a token — log the new user in.
        const loginRes = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const loginData = await loginRes.json();
        if (loginData.token) {
          login(loginData.token);
          navigate('/');
        } else {
          setError(data.error || 'Something went wrong');
        }
      }
    } catch {
      setError('Could not reach the server');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-black overflow-hidden px-6">
      <div className="absolute -left-40 -top-32 w-[560px] h-[560px] rounded-full bg-[radial-gradient(circle,rgba(124,92,255,0.32),transparent_65%)] blur-[60px]" />
      <div className="absolute -right-32 -bottom-40 w-[520px] h-[520px] rounded-full bg-[radial-gradient(circle,rgba(74,45,179,0.28),transparent_65%)] blur-[60px]" />

      <form onSubmit={handleSubmit} className="relative w-full max-w-[400px] p-8 rounded-[26px] bg-surface/68 backdrop-blur-2xl border border-white/12 shadow-[0_30px_80px_rgba(0,0,0,0.65)] flex flex-col gap-5">
        <div className="flex flex-col items-center gap-3.5 mb-1">
          <span className="text-2xl font-semibold tracking-tight text-white">trakr</span>
          <div className="text-center">
            <h1 className="text-[22px] font-semibold tracking-tight">
              {isLogin ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="text-white/45 text-[13.5px] mt-1">
              {isLogin ? 'Sign in to sync your collection' : 'Start tracking shows and movies'}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <input
            type="text"
            placeholder="Username"
            required
            className="w-full bg-white/6 border border-white/9 focus:border-accent/50 px-4 py-3.5 rounded-[13px] text-[14.5px] text-white placeholder:text-white/35 outline-none transition-colors duration-300 ease-apple"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
          <input
            type="password"
            placeholder="Password"
            required
            className="w-full bg-white/6 border border-white/9 focus:border-accent/50 px-4 py-3.5 rounded-[13px] text-[14.5px] text-white placeholder:text-white/35 outline-none transition-colors duration-300 ease-apple"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>

        {error && <p className="text-[13px] text-red-400 text-center -mt-1">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 bg-accent-strong text-white font-semibold py-3.5 rounded-[13px] shadow-[0_2px_10px_rgba(0,0,0,0.35)] hover:brightness-110 transition disabled:opacity-60"
        >
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          {isLogin ? 'Sign In' : 'Sign Up'}
        </button>

        <p
          className="text-center text-white/45 text-[13px] cursor-pointer hover:text-white/70 transition-colors"
          onClick={() => { setIsLogin(!isLogin); setError(''); }}
        >
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <span className="text-[#a892ff] font-medium">{isLogin ? 'Sign up' : 'Sign in'}</span>
        </p>
      </form>
    </div>
  );
};
