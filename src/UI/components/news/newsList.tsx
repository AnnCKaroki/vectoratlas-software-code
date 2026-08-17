import {
  Button,
  Container,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import EmailSubscriptionDialog from '../emailSubscription/EmailSubscriptionDialog';
import { useAppDispatch, useAppSelector } from '../../state/hooks';
import { getAllNewsItems } from '../../state/news/actions/news.action';
import { NewsItem } from './newsItem';
import router from 'next/router';
import { RolesEnum } from '../../state/state.types';
import { useTranslations } from 'next-intl';

export const NewsList = () => {
  const t = useTranslations('NewsPage');
  const dispatch = useAppDispatch();
  const newsItems = useAppSelector((s) => s.news.news);
  const loadingNews = useAppSelector((s) => s.news.loading);
  const isEditor = useAppSelector((state) =>
    state.auth.roles.includes(RolesEnum.EDITOR)
  );

  const [subscribeOpen, setSubscribeOpen] = useState(false);

  useEffect(() => {
    dispatch(getAllNewsItems());
  }, [dispatch]);

  if (loadingNews) {
    return (
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          py: 10,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 4,
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
          }}
        >
          <Typography color="primary" variant="h3" sx={{ fontWeight: 800 }}>
            {t('title')}
          </Typography>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" onClick={() => setSubscribeOpen(true)}>
              {t('subscribeToNews')}
            </Button>
            {isEditor && (
              <Button
                variant="contained"
                size="large"
                onClick={() => router.push('/news/edit')}
                sx={{ px: 4 }}
              >
                {t('createNewArticle')}
              </Button>
            )}
          </Box>
        </Box>

        <Box>
          {newsItems.map((n) => (
            <NewsItem key={n.id} isEditor={isEditor} item={n} />
          ))}
        </Box>
      </Container>

      <EmailSubscriptionDialog
        open={subscribeOpen}
        onClose={() => setSubscribeOpen(false)}
        defaultPreferences={{ newsAlerts: true }}
      />
    </>
  );
};

export default NewsList;