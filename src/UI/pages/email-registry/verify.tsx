import React, { useEffect, useState } from 'react';
import { Container, Box, Typography, CircularProgress, Button } from '@mui/material';
import { useRouter } from 'next/router';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { getMessages } from '../../utils/localization';
import { GetServerSidePropsContext } from 'next';

type VerifyState = 'loading' | 'success' | 'expired' | 'invalid' | 'error';

const VerifyEmailPage = (): JSX.Element => {
  const router = useRouter();
  const { code } = router.query;
  const t = useTranslations('EmailSubscription');

  const [state, setState] = useState<VerifyState>('loading');

  useEffect(() => {
    if (!router.isReady) return;

    if (!code || typeof code !== 'string') {
      setState('invalid');
      return;
    }

    const verify = async () => {
      try {
        const response = await fetch(
          `/vector-api/email-registry/verify?code=${encodeURIComponent(code)}`,
        );

        if (response.status === 410) {
          setState('expired');
          return;
        }
        if (response.status === 404) {
          setState('invalid');
          return;
        }
        if (!response.ok) {
          setState('error');
          return;
        }

        setState('success');
      } catch {
        setState('error');
      }
    };

    verify();
  }, [router.isReady, code]);

  const messages: Record<VerifyState, { title: string; body: string }> = {
    loading: { title: '', body: '' },
    success: {
      title: t('verifySuccessTitle') || 'Email verified',
      body:
        t('verifySuccessBody') ||
        "You're all set — you'll now receive the updates you signed up for.",
    },
    expired: {
      title: t('verifyExpiredTitle') || 'Link expired',
      body:
        t('verifyExpiredBody') ||
        'This verification link has expired. Please subscribe again to receive a new one.',
    },
    invalid: {
      title: t('verifyInvalidTitle') || 'Invalid link',
      body:
        t('verifyInvalidBody') ||
        "This verification link isn't valid, or has already been used.",
    },
    error: {
      title: t('verifyErrorTitle') || 'Something went wrong',
      body:
        t('verifyErrorBody') ||
        'We couldn\'t verify your email right now. Please try again shortly.',
    },
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Box sx={{ textAlign: 'center' }}>
        {state === 'loading' ? (
          <CircularProgress />
        ) : (
          <>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
              {messages[state].title}
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 4 }}>
              {messages[state].body}
            </Typography>
            <Link href="/" passHref>
              <Button variant="contained">
                {t('backHomeBtn') || 'Back to VectorAtlas'}
              </Button>
            </Link>
          </>
        )}
      </Box>
    </Container>
  );
};

export async function getServerSideProps(context: GetServerSidePropsContext) {
  return await getMessages(context);
}

export default VerifyEmailPage;