import mongoose from 'mongoose';
import signale from 'signale';

/**
 * Options for the MongoDB connection
 */
interface ConnectMongooseOptions {
  /**
   * Whether to log connection events
   * @default true
   */
  logging?: boolean;
}

/**
 * Connects to a MongoDB database using Mongoose
 *
 * @param mongooseInstance - The mongoose instance to use for connection
 * @param url - The MongoDB connection URL
 * @param options - Connection options
 * @param options.logging - Whether to log connection events (default: true)
 * @returns Promise that resolves when connected or rejects on error
 *
 * @example
 * // With default logging
 * await connectMongoose(mongoose, 'mongodb://localhost:27017/mydatabase');
 *
 * // With disabled logging
 * await connectMongoose(mongoose, 'mongodb://localhost:27017/mydatabase', { logging: false });
 */
const connectMongoose = (
  mongooseInstance: typeof mongoose,
  url: string,
  options: ConnectMongooseOptions = { logging: true }
): Promise<string> =>
  new Promise((resolve, reject) => {
    const log = (message: string) => {
      if (options.logging !== false) {
        signale.info(message);
      }
    };

    mongooseInstance.connection.on('connected', () => {
      log('Connection Established');
      resolve('Connected');
    });

    mongooseInstance.connection.on('reconnected', () => {
      log('Connection Reestablished');
    });

    mongooseInstance.connection.on('disconnected', () => {
      log('Connection Disconnected');
    });

    mongooseInstance.connection.on('close', () => {
      log('Connection Closed');
    });

    mongooseInstance.connection.on('error', (error) => {
      log(`ERROR: ${error}`);
      reject(error);
    });

    if (!mongooseInstance) {
      throw new Error('Please provide a valid mongoose instance');
    }

    if (!url) {
      throw new Error('Please provide a valid database url');
    }

    const dbName = url.substring(
      url.lastIndexOf('/') + 1,
      url.indexOf('?') !== -1 ? url.indexOf('?') : url.length
    );

    log(`Connecting to database: ${dbName}`);

    return mongooseInstance.connect(url);
  });

export default connectMongoose;
