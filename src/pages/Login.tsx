import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, Lock, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const API = import.meta.env.VITE_API_URL;

export function Login() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Somewhere sent us here mid-task (saving a title, opening the collection).
  // Land back there rather than dumping everyone on the home page.
  const returnTo = (location.state as { from?: string } | null)?.from ?? '/';

  const isLogin = mode === 'login';

  const authenticate = async (endpoint: string) => {
    const res = await fetch(`${API}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    return (await res.json()) as { token?: string; error?: string };
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const data = await authenticate(isLogin ? '/auth/login' : '/auth/signup');

      if (data.token) {
        login(data.token);
        toast(isLogin ? 'Welcome back' : 'Account created');
        navigate(returnTo, { replace: true });
        return;
      }

      if (isLogin) {
        setError(data.error || 'Those credentials did not work');
        return;
      }

      // Signup succeeds without returning a token, so sign the new user in.
      const followUp = await authenticate('/auth/login');
      if (followUp.token) {
        login(followUp.token);
        toast('Account created');
        navigate(returnTo, { replace: true });
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch {
      setError('Could not reach the server');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6 py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 -top-32 w-[560px] h-[560px] rounded-full bg-[radial-gradient(circle,rgba(124,92,255,0.3),transparent_65%)] blur-[70px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -bottom-40 w-[520px] h-[520px] rounded-full bg-[radial-gradient(circle,rgba(74,45,179,0.26),transparent_65%)] blur-[70px]"
      />

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-[400px] p-7 rounded-[28px] glass-panel shadow-[0_30px_80px_rgba(0,0,0,0.7)] flex flex-col gap-5 animate-scale-in"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <Link to="/" className="text-[22px] font-semibold tracking-tight text-white">
            trakr
          </Link>
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight">
              {isLogin ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="text-white/45 text-[13.5px] mt-1">
              {isLogin
                ? 'Sign in to sync your collection'
                : 'Start tracking shows and movies in seconds'}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <Field
            icon={User}
            type="text"
            placeholder="Username"
            autoComplete="username"
            value={form.username}
            onChange={(value) => setForm((current) => ({ ...current, username: value }))}
          />
          <Field
            icon={Lock}
            type="password"
            placeholder="Password"
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            value={form.password}
            onChange={(value) => setForm((current) => ({ ...current, password: value }))}
          />
        </div>

        {error && (
          <p role="alert" className="text-[13px] text-red-300 text-center -my-1">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="group w-full flex items-center justify-center gap-2 bg-white text-black font-semibold py-3.5 rounded-2xl transition-all duration-300 ease-apple hover:bg-white/90 active:scale-[0.98] disabled:opacity-60"
        >
          {isSubmitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              {isLogin ? 'Sign in' : 'Create account'}
              <ArrowRight
                size={15}
                className="transition-transform duration-300 ease-apple group-hover:translate-x-0.5"
              />
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(isLogin ? 'signup' : 'login');
            setError('');
          }}
          className="text-center text-white/45 text-[13px] hover:text-white/75 transition-colors duration-300"
        >
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <span className="text-accent-soft font-medium">{isLogin ? 'Sign up' : 'Sign in'}</span>
        </button>
      </form>

      <p className="relative mt-6 text-[12.5px] text-white/30 text-center max-w-xs">
        Browsing needs no account — an account is only for saving what you watch.
      </p>
    </div>
  );
}

function Field({
  icon: Icon,
  type,
  placeholder,
  autoComplete,
  value,
  onChange,
}: {
  icon: typeof User;
  type: string;
  placeholder: string;
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="relative block">
      <Icon
        size={15}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"
      />
      <input
        type={type}
        required
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-white/6 border border-white/9 focus:border-accent/50 focus:shadow-[0_0_0_4px_rgba(124,92,255,0.12)] pl-10 pr-4 py-3.5 rounded-2xl text-[14.5px] text-white placeholder:text-white/35 outline-none transition-all duration-300 ease-apple"
      />
    </label>
  );
}
