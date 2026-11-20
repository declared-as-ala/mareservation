import './config/loadEnv';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import app from './app';
import { startBookingExpiryLoop } from './jobs/bookingExpiry.job';

dotenv.config();

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    await connectDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
    // Pending booking requests stop blocking inventory once their response window has passed.
    startBookingExpiryLoop();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
