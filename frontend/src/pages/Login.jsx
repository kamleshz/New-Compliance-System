import { useContext, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowRight as ArrowRight,
  FiEye as Eye,
  FiEyeOff as EyeOff,
  FiLock as Lock,
  FiMail as Mail,
} from 'react-icons/fi';
import { AuthContext } from '../context/AuthContext.jsx';
import { signIn } from '../services/auth.js';

function Login() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    setError('');
    try {
      const result = await signIn({ email: data.email, password: data.password });
      login(result.user, result.accessToken, result.refreshToken, remember);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to sign in. Please check your credentials.');
    }
  };

  return (
    <div>
      <div className="text-center">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-700">Welcome back</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-[34px]">User Login</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Enter your credentials to continue.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-5">
        <div>
          <label htmlFor="email" className="text-sm font-extrabold text-slate-700">Work email</label>
          <div className="relative mt-2">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email', { required: 'Email is required' })}
              placeholder="name@company.com"
              className="login-field h-[52px] w-full rounded-2xl py-3 pl-11 pr-4 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400"
            />
          </div>
          {errors.email ? <p className="mt-2 text-xs font-bold text-rose-600">{errors.email.message}</p> : null}
        </div>

        <div>
          <label htmlFor="password" className="text-sm font-extrabold text-slate-700">Password</label>
          <div className="relative mt-2">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              {...register('password', { required: 'Password is required' })}
              placeholder="Enter your password"
              className="login-field h-[52px] w-full rounded-2xl py-3 pl-11 pr-12 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password ? <p className="mt-2 text-xs font-bold text-rose-600">{errors.password.message}</p> : null}
        </div>

        <div className="flex items-center justify-between gap-4 text-sm">
          <label className="inline-flex cursor-pointer items-center gap-2 font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
            />
            Remember me
          </label>
          <button type="button" className="rounded-lg font-extrabold text-emerald-700 transition hover:text-emerald-500">Forgot password?</button>
        </div>

        {error ? <p className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="login-submit group inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {isSubmitting ? 'Signing in...' : (
            <>
              Sign in securely
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-xs font-semibold text-slate-500">Need access? Contact your administrator.</p>
    </div>
  );
}

export default Login;
