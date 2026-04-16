from flask import Blueprint, request, jsonify
from db import get_db
from utils import require_admin

bp = Blueprint('stats', __name__, url_prefix='/api/stats')

def record_visit(path, ip=None, user_agent=None):
    db = get_db()
    db.execute('INSERT INTO visits (path, ip, user_agent) VALUES (?, ?, ?)', (path, ip, user_agent))
    db.execute('UPDATE stats SET total_visits = total_visits + 1 WHERE id = 1')
    if path == '/' or path == '':
        db.execute('UPDATE stats SET index_visits = index_visits + 1 WHERE id = 1')
    db.commit()

@bp.route('', methods=['GET'])
@require_admin
def get_stats():
    db = get_db()
    stats = db.execute('SELECT * FROM stats WHERE id = 1').fetchone()
    total_memos = db.execute('SELECT COUNT(*) as c FROM memos').fetchone()['c']
    total_tags = db.execute('SELECT COUNT(*) as c FROM tags').fetchone()['c']
    today_visits = db.execute("SELECT COUNT(*) as c FROM visits WHERE DATE(created_at) = DATE('now')").fetchone()['c']
    return jsonify({
        'total_visits': stats['total_visits'],
        'index_visits': stats['index_visits'],
        'today_visits': today_visits,
        'total_memos': total_memos,
        'total_tags': total_tags
    })

@bp.route('/visits', methods=['GET'])
@require_admin
def get_visits():
    db = get_db()
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('pageSize', 50, type=int)
    offset = (page - 1) * page_size
    
    rows = db.execute(
        'SELECT * FROM visits ORDER BY created_at DESC LIMIT ? OFFSET ?',
        (page_size, offset)
    ).fetchall()
    total = db.execute('SELECT COUNT(*) as c FROM visits').fetchone()['c']
    
    return jsonify({
        'visits': [dict(r) for r in rows],
        'page': page,
        'total': total,
        'has_more': offset + len(rows) < total
    })
