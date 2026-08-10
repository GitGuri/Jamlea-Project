import { useState } from 'react';
import Button from '../ui/Button';

const EMPTY = {
  sku: '',
  name: '',
  category: '',
  description: '',
  unit_price: '',
  stock_quantity: '',
  availability: 'local',
  lead_time_days: '',
  min_order_qty: '',
  image_url: '',
};

const FIELD_CLASS =
  'mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500';
const LABEL_CLASS = 'block text-xs font-medium text-slate-600';

export default function ProductForm({ initialProduct, onSubmit, onCancel }) {
  const [form, setForm] = useState(() =>
    initialProduct
      ? {
          sku: initialProduct.sku,
          name: initialProduct.name,
          category: initialProduct.category,
          description: initialProduct.description || '',
          unit_price: initialProduct.unit_price,
          stock_quantity: initialProduct.stock_quantity,
          availability: initialProduct.availability,
          lead_time_days: initialProduct.lead_time_days,
          min_order_qty: initialProduct.min_order_qty,
          image_url: initialProduct.image_url || '',
        }
      : EMPTY
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSubmit({
        sku: form.sku,
        name: form.name,
        category: form.category,
        description: form.description || null,
        unit_price: Number(form.unit_price),
        stock_quantity: Number(form.stock_quantity),
        availability: form.availability,
        lead_time_days: Number(form.lead_time_days),
        min_order_qty: Number(form.min_order_qty),
        image_url: form.image_url || null,
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save this product.');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LABEL_CLASS}>SKU</label>
          <input required value={form.sku} onChange={update('sku')} className={FIELD_CLASS} />
        </div>
        <div>
          <label className={LABEL_CLASS}>Category</label>
          <input required value={form.category} onChange={update('category')} className={FIELD_CLASS} />
        </div>
      </div>

      <div>
        <label className={LABEL_CLASS}>Name</label>
        <input required value={form.name} onChange={update('name')} className={FIELD_CLASS} />
      </div>

      <div>
        <label className={LABEL_CLASS}>Description</label>
        <textarea value={form.description} onChange={update('description')} rows={2} className={FIELD_CLASS} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LABEL_CLASS}>Unit price</label>
          <input
            required
            type="number"
            step="0.01"
            min="0"
            value={form.unit_price}
            onChange={update('unit_price')}
            className={FIELD_CLASS}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Stock quantity</label>
          <input
            required
            type="number"
            min="0"
            value={form.stock_quantity}
            onChange={update('stock_quantity')}
            className={FIELD_CLASS}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={LABEL_CLASS}>Availability</label>
          <select value={form.availability} onChange={update('availability')} className={FIELD_CLASS}>
            <option value="local">Local</option>
            <option value="national">National</option>
            <option value="global">Global</option>
          </select>
        </div>
        <div>
          <label className={LABEL_CLASS}>Lead time (days)</label>
          <input
            required
            type="number"
            min="0"
            value={form.lead_time_days}
            onChange={update('lead_time_days')}
            className={FIELD_CLASS}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Min order qty</label>
          <input
            required
            type="number"
            min="1"
            value={form.min_order_qty}
            onChange={update('min_order_qty')}
            className={FIELD_CLASS}
          />
        </div>
      </div>

      <div>
        <label className={LABEL_CLASS}>Image URL</label>
        <input value={form.image_url} onChange={update('image_url')} className={FIELD_CLASS} />
      </div>

      {error && <p className="rounded-lg bg-bad-50 px-3 py-2 text-sm text-bad-500">{error}</p>}

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {initialProduct ? 'Save changes' : 'Create product'}
        </Button>
      </div>
    </form>
  );
}
