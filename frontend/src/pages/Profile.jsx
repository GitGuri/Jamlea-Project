import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

export default function Profile() {
  const { user, updatePhone } = useAuth();
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      await updatePhone(phone);
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update your phone number.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-ink">Profile</h1>
      <p className="mt-1 text-sm text-slate-500">Manage your account details.</p>

      <Card className="mt-6 max-w-md p-6">
        <p className="text-sm text-slate-500">Email</p>
        <p className="font-medium text-ink">{user?.email}</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600">WhatsApp / phone number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition-colors duration-150 focus:border-teal-500"
              placeholder="Include country code, e.g. 27821234567"
            />
            <p className="mt-1 text-xs text-slate-400">
              Linking this lets you browse products, build quotes, and place orders over WhatsApp using
              this same account -- message our WhatsApp number once it's saved and we'll recognize you.
            </p>
          </div>

          {error && <p className="rounded-lg bg-bad-50 px-3 py-2 text-sm text-bad-500">{error}</p>}
          {saved && <p className="rounded-lg bg-good-50 px-3 py-2 text-sm text-good-500">Phone number saved.</p>}

          <Button type="submit" loading={saving}>
            Save
          </Button>
        </form>
      </Card>
    </div>
  );
}
