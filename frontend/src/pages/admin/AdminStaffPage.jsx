import { useState } from 'react';
import { createStaffUser } from '../../api/staff';
import Button from '../../components/ui/Button';

export default function AdminStaffPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState('sales_rep');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const { data } = await createStaffUser(email, password, companyName || null, role);
      setSuccess(`${data.user.email} created as ${data.user.role}.`);
      setEmail('');
      setPassword('');
      setCompanyName('');
      setRole('sales_rep');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create this staff account.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-ink">Staff</h1>
      <p className="mt-1 text-sm text-slate-500">Create sales rep or admin accounts for your team.</p>

      <div className="mt-6 max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-card">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
              placeholder="teammate@company.com"
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
          <div>
            <label className="block text-xs font-medium text-slate-600">Company name (optional)</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
            >
              <option value="sales_rep">Sales rep</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {error && <p className="rounded-lg bg-bad-50 px-3 py-2 text-sm text-bad-500">{error}</p>}
          {success && <p className="rounded-lg bg-good-50 px-3 py-2 text-sm text-good-500">{success}</p>}

          <Button type="submit" loading={saving} className="w-full">
            Create account
          </Button>
        </form>
      </div>
    </div>
  );
}
