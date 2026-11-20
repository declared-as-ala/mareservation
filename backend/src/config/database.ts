import mongoose from 'mongoose';

/** True for a database that is not on this machine / inside the compose network (e.g. Atlas). */
export function isRemoteMongoUri(uri: string): boolean {
  if (uri.startsWith('mongodb+srv:')) return true;
  try {
    const hosts = new URL(uri.replace(/^mongodb:/, 'http:')).host.replace(/^.*@/, '').split(',');
    return hosts.some((h) => !/^(localhost|127\.0\.0\.1|\[::1\]|mongo|mongodb)(:\d+)?$/i.test(h));
  } catch {
    return true; // unparseable → treat as remote (fail safe)
  }
}

export const connectDatabase = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI (or MONGO_URI) is required. Set it in .env or environment.');
    process.exit(1);
  }

  // Development and production data must never mix by accident: a non-production
  // server refuses to start against a remote database (e.g. the production Atlas
  // cluster) unless that is explicitly acknowledged.
  if (process.env.NODE_ENV !== 'production' && isRemoteMongoUri(mongoUri) && process.env.ALLOW_REMOTE_DB_IN_DEV !== 'true') {
    console.error(
      '❌ Refusing to start: NODE_ENV is not "production" but MONGODB_URI points to a REMOTE database.\n' +
        '   Use a local database (mongodb://localhost:27017/exploria360_dev) or `npm run dev:memory`.\n' +
        '   To knowingly use a remote database in development, set ALLOW_REMOTE_DB_IN_DEV=true.'
    );
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};
