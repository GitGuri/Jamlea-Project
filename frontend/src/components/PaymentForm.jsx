import { useState } from 'react';
import Button from './ui/Button';
import { uploadPaymentProof } from '../api/payments';

const MAX_PROOF_BYTES = 10 * 1024 * 1024;

const FIELD_CLASS =
  'mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition-colors duration-150 focus:border-teal-500';
const LABEL_CLASS = 'block text-xs font-medium text-slate-600';

export default function PaymentForm({ defaultAmount, onSubmit, onCancel }) {
  const [method, setMethod] = useState('bank_transfer');
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState(defaultAmount);
  const [note, setNote] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleProofChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setError('Please select an image or PDF file.');
      return;
    }
    if (file.size > MAX_PROOF_BYTES) {
      setError('File must be smaller than 10MB.');
      return;
    }
    setError('');
    setProofFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      // Optional -- only pay the upload cost when a file was actually chosen.
      let proof_url = null;
      if (proofFile) {
        const { data } = await uploadPaymentProof(proofFile);
        proof_url = data.url;
      }
      await onSubmit({ method, reference, amount: Number(amount), note: note || null, proof_url });
    } catch (err) {
      setError(err.response?.data?.error || 'Could not submit this payment.');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-slate-500">
        Enter the details of the bank transfer/EFT you made for this order. Our team will confirm
        it against our bank statement and approve it.
      </p>

      <div>
        <label className={LABEL_CLASS}>Payment method</label>
        <select value={method} onChange={(e) => setMethod(e.target.value)} className={FIELD_CLASS}>
          <option value="bank_transfer">Bank transfer / EFT</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label className={LABEL_CLASS}>Reference number</label>
        <input
          required
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          className={FIELD_CLASS}
          placeholder="e.g. transaction or reference number from your bank"
        />
      </div>

      <div>
        <label className={LABEL_CLASS}>Amount paid</label>
        <input
          required
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={FIELD_CLASS}
        />
      </div>

      <div>
        <label className={LABEL_CLASS}>Note (optional)</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={FIELD_CLASS} />
      </div>

      <div>
        <label className={LABEL_CLASS}>Proof of payment (optional)</label>
        <input
          type="file"
          accept="image/*,.pdf"
          onChange={handleProofChange}
          className="mt-2 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-teal-700 hover:file:bg-teal-100"
        />
        {proofFile && <p className="mt-1 text-xs text-slate-400">{proofFile.name}</p>}
      </div>

      {error && <p className="rounded-lg bg-bad-50 px-3 py-2 text-sm text-bad-500">{error}</p>}

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          Submit payment
        </Button>
      </div>
    </form>
  );
}
