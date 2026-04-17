const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const saveBtn = document.getElementById('saveBtn');
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadList = document.getElementById('uploadList');

let memoId = null;
const pathMatch = location.pathname.match(/^\/edit\/(\d+)$/);
if (pathMatch) {
    memoId = parseInt(pathMatch[1], 10);
    document.title = '编辑 - Vermillon';
    loadMemo(memoId);
}

mermaid.initialize({ startOnLoad: false });

editor.addEventListener('input', () => {
    updatePreview();
    updateCharCount();
});
updatePreview();
updateCharCount();

saveBtn.addEventListener('click', async () => {
    const content = editor.value.trim();
    if (!content) {
        alert('内容不能为空');
        return;
    }
    const method = memoId ? 'PUT' : 'POST';
    const url = memoId ? `/api/memos/${memoId}` : '/api/memos';
    const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
    });
    if (res.ok) {
        location.href = '/';
    } else {
        const err = await res.json();
        alert('保存失败: ' + (err.error || '未知错误'));
    }
});

async function loadMemo(id) {
    const res = await apiFetch(`/api/memos/${id}`);
    if (res.ok) {
        const data = await res.json();
        editor.value = data.content;
        updatePreview();
        updateCharCount();
    } else {
        alert('加载失败');
    }
}

function updateCharCount() {
    const count = editor.value.length;
    document.getElementById('charCount').textContent = count;
}

function updatePreview() {
    preview.innerHTML = marked.parse(editor.value || '');
    // Remove tag-only paragraphs for cleaner preview
    preview.querySelectorAll('p').forEach(p => {
        const text = p.textContent.trim();
        if (text && text.split(/\s+/).every(t => t.startsWith('#'))) {
            p.remove();
        }
    });
    renderMermaid(preview);
    if (window.Prism) {
        Prism.highlightAllUnder(preview);
    }
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

// Upload handling
uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('border-primary');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('border-primary');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('border-primary');
    if (e.dataTransfer.files.length) {
        handleFiles(e.dataTransfer.files);
    }
});

fileInput.addEventListener('change', () => {
    if (fileInput.files.length) {
        handleFiles(fileInput.files);
    }
});

async function handleFiles(files) {
    for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        if (memoId) formData.append('memo_id', memoId);

        const item = document.createElement('div');
        item.textContent = `上传中: ${file.name}...`;
        uploadList.appendChild(item);

        const res = await apiFetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (res.ok) {
            const data = await res.json();
            item.textContent = `已上传: ${file.name}`;
            insertAtCursor(getMarkdownForFile(data.url, file.name, file.type));
        } else {
            item.textContent = `上传失败: ${file.name}`;
        }
    }
}

function getMarkdownForFile(url, name, mimeType) {
    if (mimeType.startsWith('image/')) {
        return `\n![${name}](${url})\n`;
    } else if (mimeType.startsWith('video/')) {
        return `\n<video controls src="${url}"></video>\n`;
    } else {
        return `\n[${name}](${url})\n`;
    }
}

function insertAtCursor(text) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const before = editor.value.substring(0, start);
    const after = editor.value.substring(end);
    editor.value = before + text + after;
    editor.selectionStart = editor.selectionEnd = start + text.length;
    editor.focus();
    updatePreview();
}
