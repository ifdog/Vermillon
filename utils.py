import re
from functools import wraps
from flask import request, jsonify, session

def require_admin(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('user_id'):
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated

def extract_title(content: str) -> str:
    lines = content.strip().splitlines()
    for line in lines:
        stripped = line.strip()
        if stripped.startswith('# ') or stripped.startswith('## '):
            return stripped.lstrip('#').strip()
    # fallback to first 20 chars of text
    text = re.sub(r'#\S+', '', content).strip().replace('\n', ' ')
    text = text[:20]
    if len(text) == 20:
        text += '...'
    return text or '(无标题)'

TAG_PATTERN = re.compile(r'#([\w\u4e00-\u9fa5_/]+)')

def parse_tags(content: str):
    return list(set(TAG_PATTERN.findall(content)))

def allowed_file(filename, allowed_extensions):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions


def generate_slug(title: str, db) -> str:
    """Generate URL-friendly slug from title."""
    import unicodedata
    try:
        from pypinyin import lazy_pinyin
        # Convert Chinese to pinyin
        pinyin_parts = lazy_pinyin(title)
        text = ' '.join(pinyin_parts)
    except ImportError:
        # Fallback: keep only ASCII characters
        text = title
    
    # Normalize unicode
    text = unicodedata.normalize('NFKD', text)
    # Replace non-alphanumeric with hyphens
    text = re.sub(r'[^\w\s-]', '', text, flags=re.UNICODE)
    # Replace whitespace with hyphens
    text = re.sub(r'[\s]+', '-', text.strip())
    # Collapse multiple hyphens
    text = re.sub(r'-+', '-', text)
    text = text.lower().strip('-')
    
    if not text:
        text = 'memo'
    
    # Deduplicate
    base = text[:80]  # limit length
    slug = base
    counter = 1
    while True:
        existing = db.execute('SELECT id FROM memos WHERE slug = ?', (slug,)).fetchone()
        if not existing:
            break
        slug = f"{base}-{counter}"
        counter += 1
    return slug
