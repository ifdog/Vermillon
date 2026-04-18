initInkRipple();
initPaperTrail();


let adminState = {
    articlesPage: 1,
    draftsPage: 1,
    pageSize: 15,
    articlesTotal: 0,
    draftsTotal: 0,
    articlesMemos: [],
    draftsMemos: [],
    visitsPage: 1,
    visitsPageSize: 50,
    visitsTotal: 0,
    attachmentsPage: 1,
    attachmentsPageSize: 15,
    attachmentsTotal: 0
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
        newArticleBtn.classList.toggle('d-none', section !== 'articles' && section !== 'drafts');
    }
    if (section === 'articles') loadPublishedMemos(1);
    if (section === 'drafts') loadDrafts(1);
    if (section === 'stats') loadStats();
    if (section === 'site') loadSiteSettings();
    if (section === 'attachments') loadAttachments(1);
    if (section === 'backup') { /* no load needed */ }
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
async function loadPublishedMemos(page = 1) {
    const res = await apiFetch(`/api/memos?published=1&page=${page}&pageSize=${adminState.pageSize}`);
    if (!res.ok) {
        document.getElementById('articlesTableBody').innerHTML = '<tr><td colspan="4" class="text-center text-danger py-4">加载失败，请重新登录</td></tr>';
        return;
    }
    const data = await res.json();
    adminState.articlesMemos = data.memos;
    adminState.articlesTotal = data.total;
    adminState.articlesPage = page;
    renderTable(data.memos, 'articles');
    renderPagination(data.total, page, 'articles');
    document.getElementById('articlesCount').textContent = `${data.total} 篇`;
}

// Drafts Management
async function loadDrafts(page = 1) {
    const res = await apiFetch(`/api/memos?published=0&page=${page}&pageSize=${adminState.pageSize}`);
    if (!res.ok) {
        document.getElementById('draftsTableBody').innerHTML = '<tr><td colspan="4" class="text-center text-danger py-4">加载失败，请重新登录</td></tr>';
        return;
    }
    const data = await res.json();
    adminState.draftsMemos = data.memos;
    adminState.draftsTotal = data.total;
    adminState.draftsPage = page;
    renderTable(data.memos, 'drafts');
    renderPagination(data.total, page, 'drafts');
    document.getElementById('draftsCount').textContent = `${data.total} 篇`;
}

function renderTable(memos, section) {
    const tbodyId = section === 'articles' ? 'articlesTableBody' : 'draftsTableBody';
    const tbody = document.getElementById(tbodyId);
    const emptyMsg = section === 'articles'
        ? '<div class="empty-state-icon">📭</div><div class="empty-state-title">还没有文章</div><div class="empty-state-desc">点击「新建文章」开始写作</div>'
        : '<div class="empty-state-icon">📝</div><div class="empty-state-title">还没有草稿</div><div class="empty-state-desc">写作时点击「保存草稿」即可存入此处</div>';
    if (memos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">${emptyMsg}</div></td></tr>`;
        return;
    }
    tbody.innerHTML = memos.map(m => `
        <tr>
            <td class="text-muted">${m.id}</td>
            <td>
                <div class="fw-medium">${m.pinned ? '<span class="badge bg-warning text-dark me-1" style="font-size:0.65rem">置顶</span>' : ''}${escapeHtml(m.title || '(无标题)')}</div>
                <div class="small text-muted text-truncate" style="max-width: 400px">${escapeHtml(m.content.substring(0, 60))}${m.content.length > 60 ? '...' : ''}</div>
                ${m.slug ? `<div class="small text-muted"><code>${m.slug}</code></div>` : ''}
            </td>
            <td class="text-muted small">${formatDate(section === 'articles' ? m.created_at : m.updated_at)}</td>
            <td class="text-muted small">👁 ${m.read_count || 0}</td>
            <td>
                <a href="/edit/${m.id}" class="btn btn-sm btn-paper-outline me-1">编辑</a>
                <button class="btn btn-sm btn-outline-secondary pin-btn me-1" data-id="${m.id}" data-section="${section}">${m.pinned ? '取消置顶' : '置顶'}</button>
                <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${m.id}" data-section="${section}">删除</button>
            </td>
        </tr>
    `).join('');

    tbody.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('确定删除这篇文章吗？')) return;
            const id = btn.dataset.id;
            const sec = btn.dataset.section;
            const res = await apiFetch(`/api/memos/${id}`, { method: 'DELETE' });
            if (res.ok) {
                if (sec === 'articles') loadPublishedMemos(adminState.articlesPage);
                else loadDrafts(adminState.draftsPage);
            } else {
                showToast('删除失败', 'error');
            }
        });
    });

    tbody.querySelectorAll('.pin-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            const sec = btn.dataset.section;
            const memo = sec === 'articles'
                ? adminState.articlesMemos.find(m => m.id == id)
                : adminState.draftsMemos.find(m => m.id == id);
            const newPinned = !(memo.pinned ? true : false);
            const res = await apiFetch(`/api/memos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: memo.content, published: memo.published, pinned: newPinned })
            });
            if (res.ok) {
                if (sec === 'articles') loadPublishedMemos(adminState.articlesPage);
                else loadDrafts(adminState.draftsPage);
            } else {
                showToast('操作失败', 'error');
            }
        });
    });
}

function renderPagination(total, currentPage, section) {
    const totalPages = Math.ceil(total / adminState.pageSize);
    const paginationId = section === 'articles' ? 'articlesPagination' : 'draftsPagination';
    const el = document.getElementById(paginationId);
    if (totalPages <= 1) {
        el.innerHTML = '<ul class="pagination pagination-sm paper-pagination"></ul>';
        return;
    }
    let html = '';
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${currentPage - 1}">上一页</a></li>`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<li class="page-item ${i === currentPage ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
    }
    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${currentPage + 1}">下一页</a></li>`;
    el.innerHTML = '<ul class="pagination pagination-sm paper-pagination">' + html + '</ul>';

    const loadFn = section === 'articles' ? loadPublishedMemos : loadDrafts;
    el.querySelectorAll('.page-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = parseInt(link.dataset.page, 10);
            if (page >= 1) loadFn(page);
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
        el.innerHTML = '<ul class="pagination pagination-sm paper-pagination"></ul>';
        return;
    }
    let html = '';
    html += `<li class="page-item ${page === 1 ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${page - 1}">上一页</a></li>`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<li class="page-item ${i === page ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
    }
    html += `<li class="page-item ${page === totalPages ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${page + 1}">下一页</a></li>`;
    el.innerHTML = '<ul class="pagination pagination-sm paper-pagination">' + html + '</ul>';

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

// Attachments Management
async function loadAttachments(page = 1) {
    const res = await apiFetch(`/api/upload?page=${page}&pageSize=${adminState.attachmentsPageSize}`);
    if (!res.ok) {
        document.getElementById('attachmentsTableBody').innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">加载失败</td></tr>';
        return;
    }
    const data = await res.json();
    adminState.attachmentsPage = page;
    adminState.attachmentsTotal = data.total;
    renderAttachmentsTable(data.attachments);
    renderAttachmentsPagination(data.total, page);
}

function formatFileSize(bytes) {
    if (bytes === null || bytes === undefined) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function renderAttachmentsTable(attachments) {
    const tbody = document.getElementById('attachmentsTableBody');
    if (attachments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">暂无附件</td></tr>';
        return;
    }
    tbody.innerHTML = attachments.map(a => `
        <tr>
            <td class="small"><a href="/uploads/${a.filename}" target="_blank">${a.filename}</a></td>
            <td class="small text-muted">${escapeHtml(a.original_name || '-')}</td>
            <td class="small text-muted">${formatFileSize(a.size)}</td>
            <td class="small text-muted">${a.memo_id ? (a.memo_title ? escapeHtml(a.memo_title.substring(0, 30)) : '#' + a.memo_id) : '<span class="text-warning">未关联</span>'}</td>
            <td class="small text-muted">${formatDate(a.created_at)}</td>
            <td>
                <button class="btn btn-sm btn-outline-danger delete-attach-btn" data-id="${a.id}">删除</button>
            </td>
        </tr>
    `).join('');

    tbody.querySelectorAll('.delete-attach-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('确定删除这个附件吗？文件将永久删除。')) return;
            const id = btn.dataset.id;
            const res = await apiFetch(`/api/upload/${id}`, { method: 'DELETE' });
            if (res.ok) {
                loadAttachments(adminState.attachmentsPage);
            } else {
                showToast('删除失败', 'error');
            }
        });
    });
}

function renderAttachmentsPagination(total, currentPage) {
    const totalPages = Math.ceil(total / adminState.attachmentsPageSize);
    const el = document.getElementById('attachmentsPagination');
    if (totalPages <= 1) {
        el.innerHTML = '<ul class="pagination pagination-sm paper-pagination"></ul>';
        return;
    }
    let html = '';
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${currentPage - 1}">上一页</a></li>`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<li class="page-item ${i === currentPage ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
    }
    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${currentPage + 1}">下一页</a></li>`;
    el.innerHTML = '<ul class="pagination pagination-sm paper-pagination">' + html + '</ul>';

    el.querySelectorAll('.page-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = parseInt(link.dataset.page, 10);
            if (page >= 1) loadAttachments(page);
        });
    });
}

document.getElementById('cleanOrphansBtn').addEventListener('click', async () => {
    if (!confirm('确定清理所有未关联文章的附件吗？此操作不可撤销。')) return;
    const res = await apiFetch('/api/upload/orphans', { method: 'DELETE' });
    if (res.ok) {
        const data = await res.json();
        showToast(data.message || '清理完成');
        loadAttachments(1);
    } else {
        showToast('清理失败', 'error');
    }
});

// Backup & Export
document.getElementById('exportMdBtn').addEventListener('click', () => {
    window.location.href = '/api/memos/export?format=md';
});

document.getElementById('exportJsonBtn').addEventListener('click', () => {
    window.location.href = '/api/memos/export?format=json';
});

document.getElementById('backupDbBtn').addEventListener('click', () => {
    window.location.href = '/api/backup';
});

// Init
checkAuth().then(ok => {
    if (ok) {
        showSection('site');
        loadSiteSettings();
    }
});
