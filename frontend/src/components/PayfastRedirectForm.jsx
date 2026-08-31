import { useEffect, useRef } from 'react';

// PayFast checkout is a redirect-based form POST, not an API call that
// returns a payment URL to navigate to -- the backend hands back the
// signed field set (initiatePayfastPayment), and this auto-submits a
// hidden form carrying them to PayFast's own checkout page. Rendering this
// is the last thing the page does before the browser navigates away.
export default function PayfastRedirectForm({ action, fields }) {
  const formRef = useRef(null);

  useEffect(() => {
    formRef.current?.submit();
  }, []);

  return (
    <form ref={formRef} action={action} method="POST" className="hidden">
      {Object.entries(fields).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
    </form>
  );
}
