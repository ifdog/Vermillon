let adminState = {
    page: 1,
    pageSize: 15,
    total: 0,
    memos: [],
    visitsPage: 1,
    visitsPageSize: 50,
    visitsTotal: 0
};

// Auth check
async function checkAuth() {
    const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
    if (!res.ok) {
        location.href = '/login?redirect=/admin';
        return false;
    }
    return true;
}

// Navigation
document.querySelectorAll('[data-section]').forEach(btn => {
    btn.addEventListener('click', () => {
        const section = btn.dataset.section;
        showSection(section);
        document.querySelectorAll('[data-section]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

function showSection(section) {
    document.querySelectorAll('.admin-section').forEach(el => el.classList.add('d-none'));
    document.getElementById('section-' + section).classList.remove('d-none');
    const newArticleBtn = document.getElementById('newArticleBtn');
    if (newArticleBtn) {
        newArticleBtn.classList.toggle('d-none', section !== 'articles');
    }
    if (section === 'articles') loadAdminMemos(1);
    if (section === 'stats') loadStats();
    if (section === 'site') loadSiteSettings();
}

// Site Management
async function loadSiteSettings() {
    const res = await apiFetch('/api/settings');
    if (!res.ok) return;
    const data = await res.json();
    document.getElementById('siteTitle').value = data.site_title || 'Vermillon';
}

document.getElementById('saveSiteBtn').addEventListener('click', async () => {
    const title = document.getElementById('siteTitle').value.trim() || 'Vermillon';
    const res = await apiFetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_title: title })
    });
    const msgEl = document.getElementById('siteMsg');
    msgEl.classList.remove('d-none');
    if (res.ok) {
        msgEl.textContent = '保存成功';
        msgEl.className = 'small mt-2 text-success';
        document.getElementById('navSiteTitle').textContent = title;
        document.title = title;
    } else {
        msgEl.textContent = '保存失败';
        msgEl.className = 'small mt-2 text-danger';
    }
});

// User Management
document.getElementById('changeUsernameBtn').addEventListener('click', async () => {
    const newUsername = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('usernamePassword').value;
    const msgEl = document.getElementById('usernameMsg');

    const res = await apiFetch('/api/auth/change-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_username: newUsername, password })
    });

    msgEl.classList.remove('d-none');
    if (res.ok) {
        msgEl.textContent = '用户名修改成功';
        msgEl.className = 'small mt-2 text-success';
        document.getElementById('newUsername').value = '';
        document.getElementById('usernamePassword').value = '';
    } else {
        const data = await res.json();
        msgEl.textContent = data.error || '修改失败';
        msgEl.className = 'small mt-2 text-danger';
    }
});

document.getElementById('changePasswordBtn').addEventListener('click', async () => {
    const current = document.getElementById('currentPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const msgEl = document.getElementById('passwordMsg');

    const res = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: current, new_password: newPass })
    });

    msgEl.classList.remove('d-none');
    if (res.ok) {
        msgEl.textContent = '密码修改成功';
        msgEl.className = 'small mt-2 text-success';
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
    } else {
        const data = await res.json();
        msgEl.textContent = data.error || '修改失败';
        msgEl.className = 'small mt-2 text-danger';
    }
});

// Articles Management
async function loadAdminMemos(page = 1) {
    const res = await apiFetch(`/api/memos?page=${page}&pageSize=${adminState.pageSize}`);
    if (!res.ok) {
        document.getElementById('adminTableBody').innerHTML = '<tr><td colspan="4" class="text-center text-danger py-4">加载失败，请重新登录</td></tr>';
        return;
    }
    const data = await res.json();
    adminState.memos = data.memos;
    adminState.total = data.total;
    adminState.page = page;
    renderTable(data.memos);
    renderPagination(data.total, page);
    document.getElementById('totalCount').textContent = `${data.total} 篇`;
}

function renderTable(memos) {
    const tbody = document.getElementById('adminTableBody');
    if (memos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">暂无文章</td></tr>';
        return;
    }
    tbody.innerHTML = memos.map(m => `
        <tr>
            <td class="text-muted">${m.id}</td>
            <td>
                <div class="fw-medium">${escapeHtml(m.title || '(无标题)')}</div>
                <div class="small text-muted text-truncate" style="max-width: 400px">${escapeHtml(m.content.substring(0, 60))}${m.content.length > 60 ? '...' : ''}</div>
            </td>
            <td class="text-muted small">${formatDate(m.created_at)}</td>
            <td>
                <a href="/edit/${m.id}" class="btn btn-sm btn-paper-outline me-1">编辑</a>
                <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${m.id}">删除</button>
            </td>
        </tr>
    `).join('');

    tbody.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('确定删除这篇文章吗？')) return;
            const id = btn.dataset.id;
            const res = await apiFetch(`/api/memos/${id}`, { method: 'DELETE' });
            if (res.ok) {
                loadAdminMemos(adminState.page);
            } else {
                alert('删除失败');
            }
        });
    });
}

function renderPagination(total, currentPage) {
    const totalPages = Math.ceil(total / adminState.pageSize);
    const el = document.getElementById('pagination');
    if (totalPages <= 1) {
        el.innerHTML = '';
        return;
    }
    let html = '';
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${currentPage - 1}">上一页</a></li>`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<li class="page-item ${i === currentPage ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
    }
    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${currentPage + 1}">下一页</a></li>`;
    el.innerHTML = html;

    el.querySelectorAll('.page-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = parseInt(link.dataset.page, 10);
            if (page >= 1) loadAdminMemos(page);
        });
    });
}

// Stats Management
async function loadStats() {
    const res = await apiFetch('/api/stats');
    if (!res.ok) return;
    const data = await res.json();
    document.getElementById('statTotalVisits').textContent = data.total_visits;
    document.getElementById('statIndexVisits').textContent = data.index_visits;
    document.getElementById('statTodayVisits').textContent = data.today_visits;
    document.getElementById('statTotalMemos').textContent = data.total_memos;
    loadVisits(1);
}

async function loadVisits(page = 1) {
    const res = await apiFetch(`/api/stats/visits?page=${page}&pageSize=${adminState.visitsPageSize}`);
    if (!res.ok) return;
    const data = await res.json();
    adminState.visitsPage = page;
    adminState.visitsTotal = data.total;

    const tbody = document.getElementById('visitsTableBody');
    if (data.visits.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">暂无记录</td></tr>';
    } else {
        tbody.innerHTML = data.visits.map(v => `
            <tr>
                <td class="text-muted small">${formatDate(v.created_at)}</td>
                <td class="small">${escapeHtml(v.path)}</td>
                <td class="text-muted small">${v.ip || '-'}</td>
                <td class="text-muted small text-truncate" style="max-width:200px">${escapeHtml(v.user_agent || '-')}</td>
            </tr>
        `).join('');
    }

    const totalPages = Math.ceil(data.total / adminState.visitsPageSize);
    const el = document.getElementById('visitsPagination');
    if (totalPages <= 1) {
        el.innerHTML = '';
        return;
    }
    let html = '';
    html += `<li class="page-item ${page === 1 ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${page - 1}">上一页</a></li>`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<li class="page-item ${i === page ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
    }
    html += `<li class="page-item ${page === totalPages ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${page + 1}">下一页</a></li>`;
    el.innerHTML = html;

    el.querySelectorAll('.page-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const p = parseInt(link.dataset.page, 10);
            if (p >= 1) loadVisits(p);
        });
    });
}

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    location.href = '/login';
});

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Init
checkAuth().then(ok => {
    if (ok) {
        loadSiteSettings();
    }
});
