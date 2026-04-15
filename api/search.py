from flask import Blueprint, request, jsonify
from db import get_db
from api.memos import _memo_to_dict
from config import PAGE_SIZE

bp = Blueprint('search', __name__, url_prefix='/api/search')

@bp.route('', methods=['GET'])
def search():
    q = request.args.get('q', '').strip()
    page = request.args.get('page', 1, type=int)
    offset = (page - 1) * PAGE_SIZE
    
    if not q:
        return jsonify({'memos': [], 'page': page, 'total': 0, 'has_more': False})
    
    db = get_db()
    pattern = f'%{q}%'
    rows = db.execute(
        'SELECT * FROM memos WHERE content LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
        (pattern, PAGE_SIZE, offset)
    ).fetchall()
    total = db.execute('SELECT COUNT(*) as c FROM memos WHERE content LIKE ?', (pattern,)).fetchone()['c']
    
    memos = [_memo_to_dict(r, db) for r in rows]
    return jsonify({
        'memos': memos,
        'page': page,
        'total': total,
        'has_more': offset + len(memos) < total
    })
