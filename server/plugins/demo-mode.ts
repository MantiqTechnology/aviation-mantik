export default defineNitroPlugin(() => {
  const config = useRuntimeConfig();

  if (String(config.demoMode) !== 'true') {
    console.warn('MANTIK interface is running with DEMO_MODE disabled.');
  }
});
