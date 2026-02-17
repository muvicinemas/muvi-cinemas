/**
 * Muvi Cinemas - Developer Portal Server
 * 
 * Serves the developer portal and provides Docker management APIs.
 * Run with: node dev-portal/server.js (or via muvi-up.ps1)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');

const PORT = 4000;
const ROOT = path.join(__dirname);
const WORKSPACE = path.join(__dirname, '..');

// MIME types
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// Execute docker command and return result
function dockerExec(args) {
    return new Promise((resolve, reject) => {
        exec(`docker ${args}`, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
            if (error && !stdout) {
                reject(new Error(stderr || error.message));
            } else {
                resolve(stdout);
            }
        });
    });
}

// Execute docker-compose command
function composeExec(args) {
    return new Promise((resolve, reject) => {
        const composePath = path.join(WORKSPACE, 'docker-compose.yml');
        exec(`docker compose -f "${composePath}" ${args}`, { 
            cwd: WORKSPACE,
            maxBuffer: 10 * 1024 * 1024 
        }, (error, stdout, stderr) => {
            if (error && !stdout) {
                reject(new Error(stderr || error.message));
            } else {
                resolve(stdout);
            }
        });
    });
}

// API handlers
const apiHandlers = {
    // GET /api/containers - List all containers
    'GET /api/containers': async (req, res) => {
        try {
            const output = await dockerExec('ps -a --format "{{json .}}"');
            const containers = output.trim().split('\n')
                .filter(line => line)
                .map(line => {
                    const c = JSON.parse(line);
                    return {
                        Id: c.ID,
                        Names: [c.Names],
                        Image: c.Image,
                        State: c.State.toLowerCase(),
                        Status: c.Status,
                        Ports: parsePortsString(c.Ports)
                    };
                });
            sendJson(res, 200, containers);
        } catch (e) {
            sendJson(res, 500, { error: e.message });
        }
    },

    // GET /api/images - List all images
    'GET /api/images': async (req, res) => {
        try {
            const output = await dockerExec('images --format "{{json .}}"');
            const images = output.trim().split('\n')
                .filter(line => line)
                .map(line => {
                    const img = JSON.parse(line);
                    return {
                        Id: img.ID,
                        RepoTags: [img.Repository + ':' + img.Tag],
                        Size: parseSize(img.Size),
                        Created: parseDateToTimestamp(img.CreatedAt)
                    };
                });
            sendJson(res, 200, images);
        } catch (e) {
            sendJson(res, 500, { error: e.message });
        }
    },

    // POST /api/containers/:id/start
    'POST /api/containers/start': async (req, res, id) => {
        try {
            await dockerExec(`start ${id}`);
            sendJson(res, 200, { success: true });
        } catch (e) {
            sendJson(res, 500, { error: e.message });
        }
    },

    // POST /api/containers/:id/stop
    'POST /api/containers/stop': async (req, res, id) => {
        try {
            await dockerExec(`stop ${id}`);
            sendJson(res, 200, { success: true });
        } catch (e) {
            sendJson(res, 500, { error: e.message });
        }
    },

    // POST /api/containers/:id/restart
    'POST /api/containers/restart': async (req, res, id) => {
        try {
            await dockerExec(`restart ${id}`);
            sendJson(res, 200, { success: true });
        } catch (e) {
            sendJson(res, 500, { error: e.message });
        }
    },

    // POST /api/containers/:id/pause
    'POST /api/containers/pause': async (req, res, id) => {
        try {
            await dockerExec(`pause ${id}`);
            sendJson(res, 200, { success: true });
        } catch (e) {
            sendJson(res, 500, { error: e.message });
        }
    },

    // POST /api/containers/:id/unpause
    'POST /api/containers/unpause': async (req, res, id) => {
        try {
            await dockerExec(`unpause ${id}`);
            sendJson(res, 200, { success: true });
        } catch (e) {
            sendJson(res, 500, { error: e.message });
        }
    },

    // POST /api/containers/:id/remove
    'POST /api/containers/remove': async (req, res, id) => {
        try {
            await dockerExec(`rm -f ${id}`);
            sendJson(res, 200, { success: true });
        } catch (e) {
            sendJson(res, 500, { error: e.message });
        }
    },

    // POST /api/compose/up
    'POST /api/compose/up': async (req, res) => {
        try {
            await composeExec('up -d');
            sendJson(res, 200, { success: true });
        } catch (e) {
            sendJson(res, 500, { error: e.message });
        }
    },

    // POST /api/compose/down
    'POST /api/compose/down': async (req, res) => {
        try {
            await composeExec('down');
            sendJson(res, 200, { success: true });
        } catch (e) {
            sendJson(res, 500, { error: e.message });
        }
    }
};

// Parse ports string from docker ps
function parsePortsString(portsStr) {
    if (!portsStr) return [];
    const ports = [];
    const matches = portsStr.matchAll(/(\d+)->(\d+)/g);
    for (const match of matches) {
        ports.push({
            PublicPort: parseInt(match[1]),
            PrivatePort: parseInt(match[2])
        });
    }
    return ports;
}

// Parse size string to bytes
function parseSize(sizeStr) {
    if (!sizeStr) return 0;
    const match = sizeStr.match(/([\d.]+)\s*(B|KB|MB|GB)/i);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    const multipliers = { 'B': 1, 'KB': 1024, 'MB': 1024 * 1024, 'GB': 1024 * 1024 * 1024 };
    return Math.round(value * (multipliers[unit] || 1));
}

// Parse date string to timestamp
function parseDateToTimestamp(dateStr) {
    if (!dateStr) return 0;
    const date = new Date(dateStr);
    return Math.floor(date.getTime() / 1000);
}

// Send JSON response
function sendJson(res, status, data) {
    res.writeHead(status, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(data));
}

// Serve static file
function serveFile(res, filePath) {
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Not Found');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = url.pathname;

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end();
        return;
    }

    // API routes
    if (pathname.startsWith('/api/')) {
        // Check for container action routes
        const containerActionMatch = pathname.match(/^\/api\/containers\/([^\/]+)\/(start|stop|restart|pause|unpause|remove)$/);
        if (containerActionMatch && req.method === 'POST') {
            const [, id, action] = containerActionMatch;
            const handler = apiHandlers[`POST /api/containers/${action}`];
            if (handler) {
                await handler(req, res, id);
                return;
            }
        }

        // Standard API routes
        const key = `${req.method} ${pathname}`;
        if (apiHandlers[key]) {
            await apiHandlers[key](req, res);
            return;
        }

        sendJson(res, 404, { error: 'Not found' });
        return;
    }

    // Static files
    let filePath = pathname === '/' ? '/index.html' : pathname;
    
    // Try dev-portal first, then documentation folder
    let fullPath = path.join(ROOT, filePath);
    if (!fs.existsSync(fullPath) && filePath.startsWith('/documentation/')) {
        fullPath = path.join(WORKSPACE, filePath);
    }

    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        serveFile(res, fullPath);
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

// Start server
server.listen(PORT, () => {
    console.log('');
    console.log('  ╔══════════════════════════════════════════════╗');
    console.log('  ║     🎬 Muvi Developer Portal                 ║');
    console.log('  ╠══════════════════════════════════════════════╣');
    console.log(`  ║     http://localhost:${PORT}                    ║`);
    console.log('  ╚══════════════════════════════════════════════╝');
    console.log('');
    console.log('  Press Ctrl+C to stop');
    console.log('');
});

// Handle shutdown
process.on('SIGINT', () => {
    console.log('\n  Portal server stopped.');
    process.exit(0);
});
