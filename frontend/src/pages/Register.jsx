import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState('customer');
  const [companyName, setCompanyName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingMessage, setPendingMessage] = useState('');

  const isStaffSignup = accountType === 'sales_rep';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await register(
        email,
        password,
        isStaffSignup ? null : companyName,
        isStaffSignup ? 'sales_rep' : 'customer',
        isStaffSignup ? fullName : null
      );
      if (result?.pending) {
        setPendingMessage(result.message);
      } else {
        navigate('/products');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-card">
        <div className="mb-8 flex items-center gap-2">
          <img src="/jamlea.jpg" alt="TyroTech" className="h-10 w-auto object-contain" />
          <span className="font-display text-lg font-semibold text-ink">Portal</span>
        </div>

        {pendingMessage ? (
          <>
            <h1 className="font-display text-xl font-semibold text-ink">Request submitted</h1>
            <p className="mt-2 text-sm text-slate-500">{pendingMessage}</p>
            <p className="mt-6 text-center text-sm text-slate-500">
              <Link to="/login" className="font-medium text-teal-600 hover:underline">
                Back to sign in
              </Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-xl font-semibold text-ink">Create your account</h1>
            <p className="mt-1 text-sm text-slate-500">
              {isStaffSignup ? 'Apply for a staff account.' : 'Start browsing products and building quotes.'}
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600">Account type</label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
                >
                  <option value="customer">Customer</option>
                  <option value="sales_rep">Sales rep (staff)</option>
                </select>
              </div>

              {isStaffSignup ? (
                <div>
                  <label className="block text-xs font-medium text-slate-600">Full name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
                    placeholder="Jane Doe"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-600">Company name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
                    placeholder="Acme Inc."
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-600">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
                  placeholder="At least 8 characters"
                />
              </div>

              {isStaffSignup && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Staff accounts need admin approval before you can log in. You'll get an email once
                  it's reviewed.
                </p>
              )}

              {error && (
                <p className="rounded-lg bg-bad-50 px-3 py-2 text-sm text-bad-500">{error}</p>
              )}

              <Button type="submit" loading={loading} className="w-full">
                {isStaffSignup ? 'Submit request' : 'Create account'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-teal-600 hover:underline">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
