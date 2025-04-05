import process from 'process';
import signale from 'signale';

/**
 * Sets up global error handlers to prevent application crashes from uncaught errors.
 *
 * This function registers handlers for both uncaught exceptions and unhandled promise
 * rejections at the process level. Instead of allowing these errors to crash the application,
 * they are logged using the signale library, allowing the application to continue running.
 *
 * @remarks
 * While catching these errors prevents immediate crashes, underlying issues should still
 * be addressed. In production environments, this provides an opportunity to gracefully
 * handle failures while maintaining application availability.
 *
 * @example
 * ```typescript
 * // Usually called at the end of you main app file (index.ts)
 * import { catchAppErrors } from './utils/catchAppErrors';
 *
 * catchAppErrors();
 * ```
 *
 * @returns {void}
 */
const catchAppErrors = () => {
  // catch any uncaught exceptions, so that the server never crashes
  process.on('uncaughtException', (err) => {
    signale.error('Problem: uncaughtException', err);
  });

  process.on('unhandledRejection', (reason, p) => {
    signale.error(
      'Problem: Unhandled Rejection at: Promise',
      p,
      'reason:',
      reason
    );
  });
};

export { catchAppErrors };
