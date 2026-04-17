let state = {
    page: 1,
    date: null,
    tag: null,
    query: null,
    selectedMemoId: null,
    hasMore: false,
    calendarYear: new Date().getFullYear(),
    calendarMonth: new Date().getMonth() + 1,
};

const timelineEl = document.getElementById('timeline');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const loadMoreBox = document.getElementById('loadMoreBox');
const calendarBody = document.getElementById('calendarBody');
const calendarTitle = document.getElementById('calendarTitle');
const tagsList = document.getElementById('tagsList');
const filterBar = document.getElementById('filterBar');
const filterText = document.getElementById('filterText');
const clearFilterBtn = document.getElementById('clearFilter');
const searchInput = document.getElementById('searchInput');
const dayMemosList = document.getElementById('dayMemosList');
const dayMemosCount = document.getElementById('dayMemosCount');

let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    mermaid.initialize({ startOnLoad: false });
    await checkAuth();
    loadSiteTitle();
    loadMemos(true);
    loadCalendar(state.calendarYear, state.calendarMonth);
    loadTags();

    document.getElementById('prevMonth').addEventListener('click', () => changeMonth(-1));
    document.getElementById('nextMonth').addEventListener('click', () => changeMonth(1));
    loadMoreBtn.addEventListener('click', () => loadMemos(false));
    clearFilterBtn.addEventListener('click', resetFilters);

    function doSearch() {
        const q = searchInput.value.trim();
        if (q) {
            state.query = q;
            state.date = null;
            state.tag = null;
            state.page = 1;
            loadMemos(true);
        }
    }

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doSearch();
    });
    document.getElementById('searchBtn').addEventListener('click', doSearch);
});

async function checkAuth() {
    try {
        const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
        if (res.ok) {
            const data = await res.json();
            currentUser = data;
        }
    } catch (e) {}
}

function changeMonth(delta) {
    let m = state.calendarMonth + delta;
    let y = state.calendarYear;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    state.calendarMonth = m;
    state.calendarYear = y;
    loadCalendar(y, m);
}

function resetFilters() {
    state.query = null;
    state.date = null;
    state.tag = null;
    state.selectedMemoId = null;
    state.page = 1;
    searchInput.value = '';
    loadMemos(true);
    document.getElementById('dayMemosCard').classList.add('d-none');
    dayMemosList.innerHTML = '<li class="list-group-item text-muted small">点击日历日期查看</li>';
    dayMemosCount.textContent = '0';
}

async function loadMemos(reset) {
    if (reset) {
        timelineEl.innerHTML = '';
        state.page = 1;
    }

    if (state.selectedMemoId) {
        const res = await apiFetch(`/api/memos/${state.selectedMemoId}`);
        if (res.ok) {
            const memo = await res.json();
            renderMemos([memo]);
        } else {
            timelineEl.innerHTML = '<div class="text-center text-muted py-5">文章不存在</div>';
        }
        loadMoreBox.classList.add('d-none');
        updateFilterBar();
        return;
    }

    let url = `/api/memos?page=${state.page}&pageSize=5`;
    if (state.date) url += `&date=${state.date}`;
    if (state.tag) url += `&tag=${encodeURIComponent(state.tag)}`;

    if (state.query) {
        url = `/api/search?q=${encodeURIComponent(state.query)}&page=${state.page}&pageSize=5`;
    }

    const res = await apiFetch(url);
    const data = await res.json();
    state.hasMore = data.has_more;
    renderMemos(data.memos);

    if (!state.hasMore) {
        loadMoreBox.classList.add('d-none');
    } else {
        loadMoreBox.classList.remove('d-none');
        state.page++;
    }

    updateFilterBar();
}

function updateFilterBar() {
    if (!state.date && !state.tag && !state.query && !state.selectedMemoId) {
        filterBar.classList.add('d-none');
        return;
    }
    filterBar.classList.remove('d-none');
    let text = '';
    if (state.selectedMemoId) text = '查看单篇文章';
    else if (state.date) text = `日期: ${state.date}`;
    else if (state.tag) text = `标签: #${state.tag}`;
    else if (state.query) text = `搜索: "${state.query}"`;
    filterText.textContent = text;
}

function renderMemos(memos) {
    if (memos.length === 0 && state.page === 1) {
        timelineEl.innerHTML = '<div class="text-center text-muted py-5">暂无内容</div>';
        return;
    }

    memos.forEach(m => {
        const tagsHtml = m.tags.map(t => `<span class="badge memo-tag me-1" data-tag="${t}" style="cursor:pointer">#${t}</span>`).join('');

        const attachmentsHtml = m.attachments.map(att => {
            if (att.mime_type && att.mime_type.startsWith('image/')) {
                return `<img src="/uploads/${att.filename}" alt="${att.original_name || ''}">`;
            } else if (att.mime_type && att.mime_type.startsWith('video/')) {
                return `<video controls src="/uploads/${att.filename}"></video>`;
            } else {
                return `<a href="/uploads/${att.filename}" target="_blank">📎 ${att.original_name || att.filename}</a>`;
            }
        }).join('');

        const card = document.createElement('div');
        card.className = 'card paper-card memo-card';
        card.innerHTML = `
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-2 memo-header">
                    <div class="d-flex align-items-center gap-2">
                        <img src="/static/user.png" class="memo-avatar" alt="avatar">
                        <div class="memo-meta">
                            <div class="memo-username">${currentUser ? escapeHtml(currentUser.username) : 'admin'}</div>
                            <div class="memo-time text-muted" title="${formatDate(m.created_at)}">${timeAgo(m.created_at)}</div>
                        </div>
                    </div>
                    ${currentUser ? `
                    <div class="dropdown">
                        <button class="btn btn-link btn-sm text-muted p-0 memo-menu-btn" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/></svg>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li><a class="dropdown-item" href="/edit/${m.id}">编辑</a></li>
                            <li><button class="dropdown-item text-danger delete-memo-btn" data-id="${m.id}">删除</button></li>
                        </ul>
                    </div>
                    ` : ''}
                </div>
                <div class="markdown-body">${marked.parse(m.content || '')}</div>
                ${tagsHtml ? `<div class="mt-2 memo-tags">${tagsHtml}</div>` : ''}
                ${attachmentsHtml ? `<div class="memo-attachments mt-2">${attachmentsHtml}</div>` : ''}
            </div>
        `;

        // Post-process: remove tag-only paragraphs, then mermaid + prism + copy
        const mdBody = card.querySelector('.markdown-body');
        mdBody.querySelectorAll('p').forEach(p => {
            const text = p.textContent.trim();
            if (text && text.split(/\s+/).every(t => t.startsWith('#'))) {
                p.remove();
            }
        });
        renderMermaid(mdBody);
        if (window.Prism) {
            Prism.highlightAllUnder(mdBody);
        }
        addCopyButtons(mdBody);

        card.querySelectorAll('.memo-tag').forEach(el => {
            el.addEventListener('click', () => {
                state.tag = el.dataset.tag;
                state.date = null;
                state.query = null;
                state.page = 1;
                loadMemos(true);
            });
        });

        const deleteBtn = card.querySelector('.delete-memo-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async (e) => {
                if (!confirm('确定删除这条 Memo 吗？')) return;
                const id = e.target.dataset.id;
                const res = await apiFetch(`/api/memos/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    card.remove();
                } else {
                    alert('删除失败，请检查登录状态');
                }
            });
        }

        timelineEl.appendChild(card);
    });
}

async function renderMermaid(container) {
    const nodes = container.querySelectorAll('pre code.language-mermaid');
    if (!nodes.length) return;
    for (const node of nodes) {
        const pre = node.parentElement;
        const graphDefinition = node.textContent;
        try {
            const id = 'mermaid-' + Math.random().toString(36).slice(2);
            const { svg } = await mermaid.render(id, graphDefinition);
            const div = document.createElement('div');
            div.className = 'mermaid-svg my-2';
            div.innerHTML = svg;
            pre.replaceWith(div);
        } catch (e) {
            console.error('Mermaid render error', e);
        }
    }
}

function addCopyButtons(container) {
    container.querySelectorAll('pre').forEach(pre => {
        if (pre.querySelector('.code-copy-btn')) return;
        const btn = document.createElement('button');
        btn.className = 'code-copy-btn btn btn-sm btn-outline-light';
        btn.textContent = '复制';
        btn.style.position = 'absolute';
        btn.style.top = '6px';
        btn.style.right = '6px';
        btn.style.fontSize = '12px';
        btn.style.padding = '2px 8px';
        btn.addEventListener('click', () => {
            const code = pre.querySelector('code');
            const text = code ? code.textContent : pre.textContent;
            navigator.clipboard.writeText(text).then(() => {
                btn.textContent = '已复制';
                setTimeout(() => btn.textContent = '复制', 1500);
            });
        });
        pre.style.position = 'relative';
        pre.appendChild(btn);
    });
}

async function loadCalendar(year, month) {
    const res = await apiFetch(`/api/calendar/${year}/${month}`);
    const data = await res.json();
    calendarTitle.textContent = `${year}年 ${month}月`;

    let html = '';
    data.weeks.forEach(week => {
        html += '<tr>';
        week.forEach(day => {
            if (day === 0) {
                html += '<td class="other-month"></td>';
            } else {
                const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                const dayData = data.days.find(d => d.date === dateStr);
                const hasClass = dayData ? 'has-memo' : '';
                const selectedClass = state.date === dateStr ? 'selected' : '';
                const countBadge = dayData ? `<span class="calendar-count">${dayData.count}</span>` : '';
                html += `<td class="${hasClass} ${selectedClass}" data-date="${dateStr}">
                    <div class="d-flex align-items-center">
                        <span class="calendar-day-num">${day}</span>
                        ${countBadge}
                    </div>
                </td>`;
            }
        });
        html += '</tr>';
    });
    calendarBody.innerHTML = html;

    calendarBody.querySelectorAll('td[data-date]').forEach(td => {
        td.addEventListener('click', () => {
            state.date = td.dataset.date;
            state.tag = null;
            state.query = null;
            state.selectedMemoId = null;
            state.page = 1;
            loadMemos(true);
            renderDayMemos(data.days.find(d => d.date === td.dataset.date));
            loadCalendar(state.calendarYear, state.calendarMonth);
        });
    });
}

async function loadTags() {
    const res = await apiFetch('/api/tags');
    const data = await res.json();
    if (data.tags.length === 0) {
        tagsList.innerHTML = '<span class="text-muted small">暂无标签</span>';
        return;
    }
    const initialLimit = 15;
    const allTags = data.tags;
    const showTags = allTags.slice(0, initialLimit);

    function renderTags(tags) {
        tagsList.innerHTML = tags.map(t => `
            <span class="badge paper-tag tag-chip" data-tag="${t.name}" style="cursor:pointer">#${t.name} <span class="fw-normal">(${t.count})</span></span>
        `).join('');

        if (allTags.length > initialLimit && tags.length <= initialLimit) {
            const moreBtn = document.createElement('button');
            moreBtn.className = 'btn btn-link btn-sm text-decoration-none p-0 tag-more-btn';
            moreBtn.textContent = '展开全部';
            moreBtn.addEventListener('click', () => renderTags(allTags));
            tagsList.appendChild(moreBtn);
        }

        tagsList.querySelectorAll('.tag-chip').forEach(el => {
            el.addEventListener('click', () => {
                state.tag = el.dataset.tag;
                state.date = null;
                state.query = null;
                state.page = 1;
                loadMemos(true);
            });
        });
    }

    renderTags(showTags);
}

function renderDayMemos(dayData) {
    document.getElementById('dayMemosCard').classList.remove('d-none');
    if (!dayData || !dayData.memos || dayData.memos.length === 0) {
        dayMemosList.innerHTML = '<li class="list-group-item text-muted small">当日无文档</li>';
        dayMemosCount.textContent = '0';
        return;
    }
    dayMemosCount.textContent = dayData.count;
    dayMemosList.innerHTML = dayData.memos.map(m => `
        <li class="list-group-item py-2 day-memo-item" data-id="${m.id}" style="cursor:pointer">
            <div class="small fw-medium">${escapeHtml(m.title)}</div>
            <div class="text-muted" style="font-size: 0.7rem;">${m.word_count || 0} 字</div>
        </li>
    `).join('');

    dayMemosList.querySelectorAll('.day-memo-item').forEach(el => {
        el.addEventListener('click', () => {
            state.selectedMemoId = parseInt(el.dataset.id, 10);
            state.tag = null;
            state.query = null;
            state.page = 1;
            loadMemos(true);
        });
    });
}

async function loadSiteTitle() {
    try {
        const res = await fetch('/api/settings');
        if (res.ok) {
            const data = await res.json();
            const title = data.site_title || 'Vermillon';
            document.getElementById('siteTitle').textContent = title;
            document.title = title;
        }
    } catch (e) {}
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
