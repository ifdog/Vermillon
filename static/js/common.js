function apiFetch(url, options = {}) {
    options.credentials = 'same-origin';
    options.headers = options.headers || {};
    return fetch(url, options);
}

function createInkRipple(x, y) {
    const ripple = document.createElement('div');
    ripple.className = 'ink-ripple';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 700);
}

function initHighlighterSweep() {
    document.addEventListener('mouseup', () => {
        const selection = window.getSelection();
        if (!selection || selection.toString().trim().length === 0) return;

        const range = selection.getRangeAt(0);
        const rects = range.getClientRects();
        for (let i = 0; i < rects.length; i++) {
            const rect = rects[i];
            if (rect.width < 2 || rect.height < 2) continue;
            const el = document.createElement('div');
            el.className = 'highlighter-sweep';
            el.style.left = rect.left + 'px';
            el.style.top = rect.top + 'px';
            el.style.width = rect.width + 'px';
            el.style.height = rect.height + 'px';
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 500);
        }
    });
}

function initInkRipple() {
    document.addEventListener('click', (e) => {
        const tag = e.target.tagName;
        const clickable = e.target.closest('a, button, input, textarea, select, label, .dropdown-menu, .btn');
        if (tag === 'A' || tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || clickable) {
            return;
        }
        createInkRipple(e.clientX, e.clientY);
    });
}

function initPaperTrail() {
    let lastX = 0, lastY = 0, lastTime = 0;
    document.addEventListener('mousemove', (e) => {
        const now = Date.now();
        const dt = now - lastTime;
        if (dt < 80) return;

        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = dist / (dt || 1);

        lastX = e.clientX;
        lastY = e.clientY;
        lastTime = now;

        if (speed > 0.8 && Math.random() < 0.25) {
            const el = document.createElement('div');
            el.className = 'paper-trail';
            el.style.left = e.clientX + 'px';
            el.style.top = e.clientY + 'px';
            const tx = (Math.random() - 0.5) * 40;
            const rot = (Math.random() - 0.5) * 360;
            el.style.setProperty('--tx', tx + 'px');
            el.style.setProperty('--rot', rot + 'deg');
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 800);
        }
    });
}

function launchPaperConfetti() {
    const colors = ['#D86C5A', '#e5a07a', '#f3ecd0', '#e5d4b8', '#c9a87c', '#fffbf0'];
    const count = 20;
    for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.className = 'paper-confetti';
        const size = 6 + Math.random() * 8;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const left = Math.random() * 100;
        const duration = 1.2 + Math.random() * 0.8;
        const sway = 30 + Math.random() * 60;
        const rotate = (Math.random() - 0.5) * 720;

        el.style.width = size + 'px';
        el.style.height = (size * 0.6) + 'px';
        el.style.backgroundColor = color;
        el.style.left = left + 'vw';
        el.style.top = '-20px';
        el.style.borderRadius = '1px';
        el.style.opacity = '0.9';
        el.style.setProperty('--fall-duration', duration + 's');
        el.style.setProperty('--sway', sway + 'px');
        el.style.setProperty('--rotate', rotate + 'deg');

        document.body.appendChild(el);
        setTimeout(() => el.remove(), duration * 1000 + 100);
    }
}

function showToast(message, type = 'success', duration = 3000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
    });

    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => {
            toast.remove();
        });
    }, duration);
}

function timeAgo(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return '刚刚';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} 分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小时前`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} 天前`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} 个月前`;
    return `${Math.floor(months / 12)} 年前`;
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

(function loadVersion() {
    fetch('/api/version')
        .then(r => r.json())
        .then(d => {
            const el = document.getElementById('siteVersion');
            if (el) el.textContent = 'Version ' + (d.version || 'unknown');
        })
        .catch(() => {});
})();

