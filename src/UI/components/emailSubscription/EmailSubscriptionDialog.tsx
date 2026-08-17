import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  Button,
  Typography,
  CircularProgress,
  Box,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useEmailSubscription } from './useEmailSubscription';

interface EmailSubscriptionDialogProps {
  open: boolean;
  onClose: () => void;
  defaultPreferences?: {
    newsAlerts?: boolean;
    newDatasetAlerts?: boolean;
  };
}

export default function EmailSubscriptionDialog({
  open,
  onClose,
  defaultPreferences,
}: EmailSubscriptionDialogProps) {
  const t = useTranslations('EmailSubscription');
  const { subscribe, loading, success, error, reset } = useEmailSubscription();

  const [email, setEmail] = useState('');
  const [newsAlerts, setNewsAlerts] = useState(
    !!defaultPreferences?.newsAlerts
  );
  const [newDatasetAlerts, setNewDatasetAlerts] = useState(
    !!defaultPreferences?.newDatasetAlerts
  );

  useEffect(() => {
    if (open) {
      setEmail('');
      setNewsAlerts(!!defaultPreferences?.newsAlerts);
      setNewDatasetAlerts(!!defaultPreferences?.newDatasetAlerts);
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSubmit = async () => {
    await subscribe({
      email,
      isNewsEnabled: newsAlerts,
      isNewDatasetEnabled: newDatasetAlerts,
    });
  };

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canSubmit =
    isValidEmail && (newsAlerts || newDatasetAlerts) && !loading;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('title') || 'Subscribe for updates'}</DialogTitle>

      <DialogContent>
        {success ? (
          <Box sx={{ py: 2 }}>
            <Typography>
              {t('successMessage') ||
                "Almost done! We've sent a verification link to your email — please check your inbox to confirm your subscription."}
            </Typography>
          </Box>
        ) : (
          <>
            <Typography sx={{ mb: 2 }} color="text.secondary">
              {t('description') ||
                'Get notified about news and new datasets on VectorAtlas.'}
            </Typography>

            <TextField
              autoFocus
              fullWidth
              label={t('emailLabel') || 'Email address'}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              disabled={loading}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={newsAlerts}
                  onChange={(e) => setNewsAlerts(e.target.checked)}
                  disabled={loading}
                />
              }
              label={t('newsAlertsLabel') || 'News updates'}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={newDatasetAlerts}
                  onChange={(e) => setNewDatasetAlerts(e.target.checked)}
                  disabled={loading}
                />
              }
              label={t('newDatasetAlertsLabel') || 'New dataset alerts'}
            />

            {error && (
              <Typography color="error" sx={{ mt: 1 }}>
                {error}
              </Typography>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {success ? t('closeBtn') || 'Close' : t('cancelBtn') || 'Cancel'}
        </Button>
        {!success && (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              t('subscribeBtn') || 'Subscribe'
            )}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}