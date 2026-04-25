import './emailQueue';
import './notificationQueue';

export { enqueueEmail } from './emailQueue';
export { enqueueNotification } from './notificationQueue';

export const initQueues = () => {
  console.log('[queues] Email and notification workers initialized');
};
