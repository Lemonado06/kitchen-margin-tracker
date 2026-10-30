import { createContext, useContext, useEffect, useState } from 'react';

// Fetches data when `deps` change; call reload() after a create/update/delete to fetch again.
// Returns [data, reload, error]; data is null until the first response arrives.
export function useLoad(fetcher, deps) {
  const [state, setState] = useState({ data: null, error: '' });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    fetcher()
      .then((data) => active && setState({ data, error: '' }))
      .catch((err) => active && setState((s) => ({ ...s, error: err.response?.data?.error || 'Failed to load data' })));
    return () => { active = false; };
    // fetcher is a new closure every render; deps lists what it actually reads
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  return [state.data, () => setVersion((v) => v + 1), state.error];
}

// Toasts and confirm dialogs, provided by <FeedbackProvider> in components/Feedback.jsx
export const FeedbackContext = createContext(null);

export function useToast() {
  return useContext(FeedbackContext).toast;
}

export function useConfirm() {
  return useContext(FeedbackContext).confirm;
}

export const formatINR = (n) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
