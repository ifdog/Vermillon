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
