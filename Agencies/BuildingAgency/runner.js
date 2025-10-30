import ProjectManager from './ProjectManager.js';

(async () => {
  try {
    const pm = new ProjectManager();
    await pm.initialize();
    console.log('✅ BuildingAgency ProjectManager initialized');

    // Keep process alive and periodically log status
    setInterval(async () => {
      try {
        const stats = pm.getStats();
        console.log('📝 PM stats:', JSON.stringify(stats));
      } catch (e) {
        console.error('Failed to get PM stats', e);
      }
    }, 30_000);

    // expose a basic HTTP health endpoint
    const http = await import('http');
    const server = http.createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', initialized: pm.initialized }));
        return;
      }
      res.writeHead(404);
      res.end('not found');
    });
    server.listen(4000, () => console.log('🚦 BuildingAgency health listening on 4000'));

  } catch (err) {
    console.error('Failed to start ProjectManager:', err);
    process.exit(1);
  }
})();
