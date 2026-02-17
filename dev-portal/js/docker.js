// Docker Manager - JavaScript

const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', () => {
    loadContainers();
    loadImages();
    
    // Refresh every 10 seconds
    setInterval(() => {
        loadContainers();
    }, 10000);
});

// Load and display containers
async function loadContainers() {
    const loadingEl = document.getElementById('containers-loading');
    const emptyEl = document.getElementById('containers-empty');
    const tableEl = document.getElementById('containers-table');
    const bodyEl = document.getElementById('containers-body');

    try {
        const response = await fetch(`${API_BASE}/containers`);
        if (!response.ok) throw new Error('API not available');
        
        const containers = await response.json();
        
        // Filter to only muvi containers
        const muviContainers = containers.filter(c => 
            c.Names.some(n => n.includes('muvi'))
        );

        loadingEl.style.display = 'none';

        if (muviContainers.length === 0) {
            emptyEl.style.display = 'block';
            tableEl.style.display = 'none';
            return;
        }

        emptyEl.style.display = 'none';
        tableEl.style.display = 'table';

        bodyEl.innerHTML = muviContainers.map(c => {
            const name = c.Names[0].replace(/^\//, '');
            const image = c.Image;
            const state = c.State;
            const status = c.Status;
            const ports = formatPorts(c.Ports);

            return `
                <tr data-id="${c.Id}">
                    <td>
                        <span class="container-name">${name}</span>
                    </td>
                    <td>
                        <span class="container-image">${image}</span>
                    </td>
                    <td>
                        <span class="status-badge ${state}">${status}</span>
                    </td>
                    <td>
                        <span class="container-ports">${ports || '-'}</span>
                    </td>
                    <td>
                        <div class="action-btns">
                            ${state === 'running' ? `
                                <button class="btn btn-warning btn-sm" onclick="pauseContainer('${c.Id}')">⏸️</button>
                                <button class="btn btn-danger btn-sm" onclick="stopContainer('${c.Id}')">⏹️</button>
                                <button class="btn btn-secondary btn-sm" onclick="restartContainer('${c.Id}')">🔄</button>
                            ` : state === 'paused' ? `
                                <button class="btn btn-success btn-sm" onclick="unpauseContainer('${c.Id}')">▶️</button>
                                <button class="btn btn-danger btn-sm" onclick="stopContainer('${c.Id}')">⏹️</button>
                            ` : `
                                <button class="btn btn-success btn-sm" onclick="startContainer('${c.Id}')">▶️</button>
                                <button class="btn btn-danger btn-sm" onclick="removeContainer('${c.Id}')">🗑️</button>
                            `}
                            <button class="btn btn-secondary btn-sm" onclick="viewContainerLogs('${name}')">📋</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (e) {
        console.error('Failed to load containers:', e);
        loadingEl.innerHTML = `
            <div class="empty-state-icon">⚠️</div>
            <p>Could not connect to Docker API</p>
            <p style="margin-top: 1rem; font-size: 0.875rem;">
                Make sure the dev portal server is running:<br>
                <code>node dev-portal/server.js</code>
            </p>
        `;
    }
}

// Load and display images
async function loadImages() {
    const loadingEl = document.getElementById('images-loading');
    const tableEl = document.getElementById('images-table');
    const bodyEl = document.getElementById('images-body');

    try {
        const response = await fetch(`${API_BASE}/images`);
        if (!response.ok) throw new Error('API not available');
        
        const images = await response.json();
        
        // Filter to only muvi images
        const muviImages = images.filter(img => 
            img.RepoTags && img.RepoTags.some(t => t.includes('muvi'))
        );

        loadingEl.style.display = 'none';
        tableEl.style.display = 'table';

        bodyEl.innerHTML = muviImages.map(img => {
            const tag = img.RepoTags ? img.RepoTags[0] : '<none>';
            const [repo, version] = tag.split(':');
            const size = formatBytes(img.Size);
            const created = formatDate(img.Created);

            return `
                <tr>
                    <td><span class="container-name">${repo}</span></td>
                    <td><span class="container-ports">${version || 'latest'}</span></td>
                    <td>${size}</td>
                    <td>${created}</td>
                </tr>
            `;
        }).join('');

    } catch (e) {
        console.error('Failed to load images:', e);
        loadingEl.innerHTML = `
            <div class="empty-state-icon">⚠️</div>
            <p>Could not load images</p>
        `;
    }
}

// Container actions
async function startContainer(id) {
    await containerAction(id, 'start');
}

async function stopContainer(id) {
    await containerAction(id, 'stop');
}

async function restartContainer(id) {
    await containerAction(id, 'restart');
}

async function pauseContainer(id) {
    await containerAction(id, 'pause');
}

async function unpauseContainer(id) {
    await containerAction(id, 'unpause');
}

async function removeContainer(id) {
    if (confirm('Remove this container?')) {
        await containerAction(id, 'remove');
    }
}

async function containerAction(id, action) {
    try {
        const response = await fetch(`${API_BASE}/containers/${id}/${action}`, {
            method: 'POST'
        });
        
        if (response.ok) {
            showToast(`Container ${action}ed successfully`);
            setTimeout(loadContainers, 500);
        } else {
            const error = await response.json();
            showToast(`Failed: ${error.message}`, true);
        }
    } catch (e) {
        showToast(`Error: ${e.message}`, true);
    }
}

// Bulk actions
async function startAllContainers() {
    try {
        const response = await fetch(`${API_BASE}/compose/up`, { method: 'POST' });
        if (response.ok) {
            showToast('Starting all containers...');
            setTimeout(loadContainers, 2000);
        }
    } catch (e) {
        showToast('Failed to start containers', true);
    }
}

async function stopAllContainers() {
    if (confirm('Stop all Muvi containers?')) {
        try {
            const response = await fetch(`${API_BASE}/compose/down`, { method: 'POST' });
            if (response.ok) {
                showToast('Stopping all containers...');
                setTimeout(loadContainers, 2000);
            }
        } catch (e) {
            showToast('Failed to stop containers', true);
        }
    }
}

function refreshContainers() {
    document.getElementById('containers-loading').style.display = 'flex';
    document.getElementById('containers-table').style.display = 'none';
    loadContainers();
    loadImages();
}

// Quick actions
function rebuildService(service) {
    showToast(`Run in terminal: .\\muvi-up.ps1 restart -BuildOnly ${service}`);
    copyCmd(`.\\muvi-up.ps1 restart -BuildOnly ${service}`);
}

function viewLogs() {
    showToast('Run in terminal: .\\muvi-up.ps1 logs');
    copyCmd('.\\muvi-up.ps1 logs');
}

function viewContainerLogs(name) {
    copyCmd(`docker logs -f ${name}`);
}

function pruneDocker() {
    if (confirm('This will remove all unused Docker data. Continue?')) {
        showToast('Run in terminal: docker system prune -a');
        copyCmd('docker system prune -a');
    }
}

// Utilities
function formatPorts(ports) {
    if (!ports || ports.length === 0) return '';
    return ports
        .filter(p => p.PublicPort)
        .map(p => `${p.PublicPort}→${p.PrivatePort}`)
        .join(', ');
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(timestamp) {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' min ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' hours ago';
    return Math.floor(diff / 86400000) + ' days ago';
}

function copyCmd(cmd) {
    navigator.clipboard.writeText(cmd).then(() => {
        showToast('Copied: ' + cmd);
    });
}

function showToast(message, isError = false) {
    const toast = document.getElementById('copyToast');
    toast.textContent = message;
    toast.style.background = isError ? 'var(--accent-danger)' : 'var(--accent-success)';
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
