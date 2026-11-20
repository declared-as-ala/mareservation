/**
 * Must be the FIRST import of every entry point: ES module imports are evaluated in
 * order, so modules that read process.env at load time (e.g. auth middleware) need
 * .env to be loaded before them. Skipped under tests so they can never pick up real
 * credentials (emails, payments, remote databases).
 */
import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'test') dotenv.config();
