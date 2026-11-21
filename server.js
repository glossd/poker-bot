const http = require('node:http');

const server = http.createServer((req, res) => {
    res.end('OK');
});

let closeFunc

module.exports = {
    async startServer(cf) {
        closeFunc = cf
        server.listen(3000);
    }
}

let isShuttingDown = false;

async function gracefulShutdown(signal) {
    if (isShuttingDown) return; // Prevent duplicate triggers
    isShuttingDown = true;

    console.log(`${signal} received. Starting graceful shutdown...`);

    // 1. Force exit if cleanup hangs past the grace period
    const forceExitTimeout = setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        server.closeAllConnections(); // Force close active sockets (Node 18.2+)
        process.exit(1);
    }, 10_000);

    // Unref the timer so it doesn't keep the event loop alive on its own
    forceExitTimeout.unref();

    // 2. Stop accepting new connections and wait for active ones to finish
    server.close(async (err) => {
        if (err) {
            console.error('Error closing server:', err);
            process.exit(1);
        }

        closeFunc().then(r => {
            console.log('Cleanup complete. Exiting.');
            process.exit(0);
        }).catch(e => {
            console.error('Cleanup failed:', e);
            process.exit(1);
        })
    });

    // Optional (Node 18.2+): Close idle HTTP keep-alive connections immediately
    server.closeIdleConnections();
}

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM')); // Containers / Kubernetes / systemd
process.on('SIGINT', () => gracefulShutdown('SIGINT'));