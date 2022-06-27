import signale from 'signale';

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
