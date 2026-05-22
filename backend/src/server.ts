import 'dotenv/config';
import { connectDatabase } from './config/database';
import app from './app';
import { startHoldExpiryLoop } from './jobs/holdExpiry.service';
import { startNotificationCrons } from './jobs/notifications.cron';
import { startPayoutCron } from './jobs/payouts.cron';

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    await connectDatabase();
    startHoldExpiryLoop();
    startNotificationCrons();
    startPayoutCron();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
