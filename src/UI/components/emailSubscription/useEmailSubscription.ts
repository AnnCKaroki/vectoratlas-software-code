import { useState } from 'react';

interface SubscribePayload {
  email: string;
  isNewsEnabled: boolean;
  isNewDatasetEnabled: boolean;
}

interface ApiErrorResponse {
  message: string | string[];
  error: string;
  statusCode: number;
}

export function useEmailSubscription() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscribe = async (payload: SubscribePayload) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/vector-api/email-registry/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await response.json();

      if (!response.ok) {
        const errBody = json as ApiErrorResponse;
        const messageText = Array.isArray(errBody.message)
          ? errBody.message.join(', ')
          : errBody.message || 'Subscription failed. Please try again.';
        throw new Error(messageText);
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setSuccess(false);
    setError(null);
  };

  return { subscribe, loading, success, error, reset };
}