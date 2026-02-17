// Dev Portal - Main JavaScript

document.addEventListener('DOMContentLoaded', () => {
    checkAllServices();
    setInterval(checkAllServices, 30000); // Check every 30 seconds
});

// Check all service statuses via Docker API
async function checkAllServices() {
    const statusElements = document.querySelectorAll('.service-status[data-container]');
    
    try {
        const response = await fetch('/api/containers');
        if (response.ok) {
            const containers = await response.json();
            
            // Create a map of container name -> running state
            const containerMap = {};
            containers.forEach(c => {
                // Container names include leading slash, e.g., "/muvi-gateway"
                const name = c.Names[0].replace(/^\//, '');
                containerMap[name] = c.State === 'running';
            });

            let onlineCount = 0;
            statusElements.forEach(el => {
                const containerName = el.dataset.container;
                const isOnline = containerMap[containerName] || false;
                el.classList.toggle('online', isOnline);
                el.classList.toggle('offline', !isOnline);
                if (isOnline) onlineCount++;
            });

            // Update global status indicator
            updateGlobalStatus(onlineCount, statusElements.length);
        }
    } catch (e) {
        // API not available, mark all services as unknown
        statusElements.forEach(el => {
            el.classList.remove('online', 'offline');
        });
        updateGlobalStatus(0, 0);
    }
}

// Update the global status indicator in header
function updateGlobalStatus(online, total) {
    const statusEl = document.getElementById('status');
    const dot = statusEl.querySelector('.status-dot');
    const text = statusEl.querySelector('.status-text');

    if (online === total) {
        dot.classList.add('online');
        dot.classList.remove('offline');
        text.textContent = 'All services online';
    } else if (online === 0) {
        dot.classList.remove('online');
        dot.classList.add('offline');
        text.textContent = 'Services offline';
    } else {
        dot.classList.remove('online', 'offline');
        text.textContent = `${online}/${total} services online`;
    }
}

// Copy command to clipboard
function copyCommand(action) {
    const commands = {
        'up': '.\\muvi-up.ps1 up',
        'down': '.\\muvi-up.ps1 down',
        'restart': '.\\muvi-up.ps1 restart',
        'logs': '.\\muvi-up.ps1 logs',
        'seed': '.\\muvi-up.ps1 seed',
        'ide': '.\\muvi-up.ps1 ide'
    };

    const cmd = commands[action];
    if (cmd) {
        navigator.clipboard.writeText(cmd).then(() => {
            showToast('Copied to clipboard!');
        });
    }
}

// Show toast notification
function showToast(message) {
    const toast = document.getElementById('copyToast');
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

// Open VS Code debugger hint
function openVSCode() {
    showToast('Press Ctrl+Shift+D in VS Code, then select "Attach: All Services"');
}
