let adminState = {
    page: 1,
    pageSize: 15,
    total: 0,
    memos: []
};

const tableBody = document.getElementById('adminTableBody');
const totalCountEl = document.getElementById('totalCount');
const paginationEl = document.querySelector('.paper-pagination');

async function loadAdminMemos(page = 1) {
    const res = await apiFetch(`/api/memos?page=${page}&pageSize=${adminState.pageSize}`);
    if (!res.ok) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-4">加载失败，请检查 Admin Key</td></tr>';
        return;
    }
    const data = await res.json();
    adminState.memos = data.memos;
    adminState.total = data.total;
    adminState.page = page;
    renderTable(data.memos);
    renderPagination(data.total, page);
    totalCountEl.textContent = `${data.total} 篇`;
}

function renderTable(memos) {
    if (memos.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">暂无文章</td></tr>';
        return;
    }
    tableBody.innerHTML = memos.map(m => `
        <tr>
            <td class="text-muted">${m.id}</td>
            <td>
                <div class="fw-medium">${escapeHtml(m.title || '(无标题)')}</div>
                <div class="small text-muted text-truncate" style="max-width: 400px">${escapeHtml(m.content.substring(0, 60))}${m.content.length > 60 ? '...' : ''}</div>
            </td>
            <td>${m.mood || '-'}</td>
            <td class="text-muted small">${formatDate(m.created_at)}</td>
            <td>
                <a href="/edit/${m.id}" class="btn btn-sm btn-paper-outline me-1">编辑</a>
                <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${m.id}">删除</button>
            </td>
        </tr>
    `).join('');

    tableBody.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('确定删除这篇文章吗？')) return;
            const id = btn.dataset.id;
            const res = await apiFetch(`/api/memos/${id}`, { method: 'DELETE' });
            if (res.ok) {
                loadAdminMemos(adminState.page);
            } else {
                alert('删除失败，请检查 Admin Key');
            }
        });
    });
}

function renderPagination(total, currentPage) {
    const totalPages = Math.ceil(total / adminState.pageSize);
    if (totalPages <= 1) {
        paginationEl.innerHTML = '';
        return;
    }

    let html = '';
    // Previous
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${currentPage - 1}">上一页</a>
    </li>`;

    for (let i = 1; i <= totalPages; i++) {
        html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
            <a class="page-link" href="#" data-page="${i}">${i}</a>
        </li>`;
    }

    // Next
    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${currentPage + 1}">下一页</a>
    </li>`;

    paginationEl.innerHTML = html;

    paginationEl.querySelectorAll('.page-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = parseInt(link.dataset.page, 10);
            if (page >= 1) {
                loadAdminMemos(page);
            }
        });
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Wait for adminKey to be available from common.js
setTimeout(() => {
    loadAdminMemos(1);
}, 100);
