export const NOTIFICATIONS_QUEUE = 'notifications';
export const SEND_NOTIFICATION_JOB = 'send-notification';

export const NOTIFICATION_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
} as const;
