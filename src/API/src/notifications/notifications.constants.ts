export const NOTIFICATIONS_QUEUE = 'notifications';
export const NEW_DATASET_APPROVED_JOB = 'new-dataset-approved';

/** BullMQ retry policy for notification sends (configured at enqueue time). */
export const NOTIFICATION_JOB_OPTIONS = {
  attempts: 5,
  backoff: {
    type: 'exponential' as const,
    delay: 10_000,
  },
};
