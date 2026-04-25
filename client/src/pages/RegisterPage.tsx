import { useForm } from 'react-hook-form';
import { DevTool } from '@hookform/devtools';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

const schema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  companyAddress: z.string().min(5, 'Please enter a valid address'),
  name: z.string().min(2, 'Your name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  role: z.enum(['ADMIN', 'FINANCE', 'PROCUREMENT', 'MANAGER', 'VENDOR'] as const),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  FINANCE: 'Finance',
  PROCUREMENT: 'Procurement',
  MANAGER: 'Manager',
  VENDOR: 'Vendor (External)',
};

export default function RegisterPage() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    control,
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { role: 'PROCUREMENT' } });

  const onSubmit = async (data: FormData) => {
    try {
      await api.post('/auth/register', {
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
        companyName: data.companyName,
        companyAddress: data.companyAddress,
      });
      navigate('/login', { state: { registered: true } });
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Registration failed. Please try again.';
      setError('root', { message: msg });
    }
  };

  const Field = ({ label, name, type = 'text', placeholder }: { label: string; name: keyof FormData; type?: string; placeholder?: string }) => (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
      <input
        {...register(name)}
        type={type}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
      />
      {errors[name] && <p className="text-red-400 text-xs mt-1">{errors[name]?.message as string}</p>}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-purple-950 to-slate-900 py-12 px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-linear-to-br from-violet-500 to-purple-600 shadow-lg mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Create Account</h1>
          <p className="text-slate-400 mt-1">Set up your VendorHub workspace</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {errors.root && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
                <p className="text-red-400 text-sm">{errors.root.message}</p>
              </div>
            )}

            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Company Info</p>
            <Field label="Company Name" name="companyName" placeholder="Acme Corp" />
            <Field label="Company Address" name="companyAddress" placeholder="123 Business Ave, Mumbai" />

            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest pt-2">Your Details</p>
            <Field label="Your Full Name" name="name" placeholder="John Doe" />
            <Field label="Email Address" name="email" type="email" placeholder="john@acme.com" />
            <Field label="Password" name="password" type="password" placeholder="Min 8 characters" />
            <Field label="Confirm Password" name="confirmPassword" type="password" placeholder="Re-enter password" />

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Your Role</label>
              <select
                {...register('role')}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
              >
                {Object.entries(ROLE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              {errors.role && <p className="text-red-400 text-xs mt-1">{errors.role.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-linear-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-60 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-violet-500/25 mt-2"
            >
              {isSubmitting ? 'Creating accountâ€¦' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-violet-400 hover:text-violet-300 font-medium transition">
              Sign in
            </Link>
          </p>
        </div>
      </div>
      {import.meta.env.DEV ? <DevTool control={control} /> : null}
    </div>
  );
}
