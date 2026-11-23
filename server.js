const http = require('node:http');

const server = http.createServer((req, res) => {
    res.end('OK');
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error('Port 3001 in use, retrying in 1s...');
        setTimeout(() => server.listen(3001), 1000);
    } else {
        console.error('Server error:', err);
        process.exit(1);
    }
});

let closeFunc

module.exports = {
    async startServer(cf) {
        closeFunc = cf
        server.listen(3001);
    }
}

let isShuttingDown = false;

async function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`${signal} received. Starting graceful shutdown...`);

    const forceExitTimeout = setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        if (typeof server.closeAllConnections === 'function') {
            server.closeAllConnections();
        }
        process.exit(1);
    }, 10_000);

    forceExitTimeout.unref();

    server.close(async (err) => {
        if (err) {
            console.error('Error closing server:', err);
            process.exit(1);
        }

        try {
            await closeFunc();
            console.log('Cleanup complete. Exiting.');
            process.exit(0);
        } catch (e) {
            console.error('Cleanup failed:', e);
            process.exit(1);
        }
    });

    if (typeof server.closeIdleConnections === 'function') {
        server.closeIdleConnections();
    }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
    process.exit(1);
});