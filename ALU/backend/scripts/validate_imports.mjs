// simple import validator for new admin route modules
try {
  const modules = [
    './routes/adminroutes/tickets.js',
    './routes/adminroutes/benefits.js',
    './routes/adminroutes/events.js',
    './routes/adminroutes/reports.js',
  ];

  (async () => {
    for (const m of modules) {
      // dynamic import will surface syntax errors without executing route handlers
      await import(m);
      console.log('import ok:', m);
    }
    console.log('All imports successful');
  })().catch((err) => {
    console.error('Import failed:', err && err.stack ? err.stack : err);
    process.exit(1);
  });
} catch (err) {
  console.error('Validation script error:', err && err.stack ? err.stack : err);
  process.exit(1);
}
