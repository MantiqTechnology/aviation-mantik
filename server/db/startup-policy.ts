type StartupResetEnv = {
  MANTIK_RESET_ON_STARTUP?: unknown;
  MANTIK_SKIP_STARTUP_RESET?: unknown;
};

export function shouldResetDemoDatabaseOnStartup(
  config: { demoMode?: unknown },
  env: StartupResetEnv = process.env as StartupResetEnv
) {
  return (
    String(config.demoMode) === 'true' &&
    env.MANTIK_RESET_ON_STARTUP === 'true' &&
    env.MANTIK_SKIP_STARTUP_RESET !== 'true'
  );
}

export function shouldSeedDemoDatabaseOnStartup(
  config: { demoMode?: unknown },
  env: StartupResetEnv = process.env as StartupResetEnv
) {
  return String(config.demoMode) === 'true' && env.MANTIK_SKIP_STARTUP_RESET !== 'true';
}
