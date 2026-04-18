import re
from flask import Blueprint, request, jsonify, g, session
from db import get_db
from utils import require_admin, extract_title, parse_tags
from config import PAGE_SIZE

bp = Blueprint('memos', __name__, url_prefix='/api/memos')

def _get_memo_tags(db, memo_id):
    rows = db.execute(
        'SELECT t.name FROM tags t JOIN memo_tags mt ON t.id = mt.tag_id WHERE mt.memo_id = ?',
        (memo_id,)
    ).fetchall()
    return [r['name'] for r in rows]

def _get_memo_attachments(db, memo_id):
    rows = db.execute(
        'SELECT id, filename, original_name, mime_type, size FROM attachments WHERE memo_id = ?',
        (memo_id,)
    ).fetchall()
    return [dict(r) for r in rows]

def _memo_to_dict(row, db):
    return {
        'id': row['id'],
        'content': row['content'],
        'title': row['title'],
        'mood': row['mood'],
        'word_count': row['word_count'] if 'word_count' in row.keys() else 0,
        'read_count': row['read_count'] if 'read_count' in row.keys() else 0,
        'updated_count': row['updated_count'] if 'updated_count' in row.keys() else 0,
        'published': row['published'] if 'published' in row.keys() else 1,
        'created_at': row['created_at'],
        'updated_at': row['updated_at'],
        'tags': _get_memo_tags(db, row['id']),
        'attachments': _get_memo_attachments(db, row['id'])
    }

def _update_tags(db, memo_id, content):
    # remove old tags
    db.execute('DELETE FROM memo_tags WHERE memo_id = ?', (memo_id,))
    # insert new tags
    tag_names = parse_tags(content)
    for name in tag_names:
        db.execute('INSERT OR IGNORE INTO tags (name) VALUES (?)', (name,))
        tag_row = db.execute('SELECT id FROM tags WHERE name = ?', (name,)).fetchone()
        db.execute('INSERT INTO memo_tags (memo_id, tag_id) VALUES (?, ?)', (memo_id, tag_row['id']))

@bp.route('', methods=['GET'])
def list_memos():
    db = get_db()
    date_filter = request.args.get('date')
    tag_filter = request.args.get('tag')
    published_filter = request.args.get('published', type=int)
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('pageSize', PAGE_SIZE, type=int)
    offset = (page - 1) * page_size
    
    is_admin = 'user_id' in session
    where_clauses = []
    params = []
    
    # Anonymous users only see published memos
    if not is_admin:
        where_clauses.append("published = 1")
    elif published_filter is not None:
        where_clauses.append("published = ?")
        params.append(published_filter)
    
    if date_filter:
        where_clauses.append("DATE(created_at) = ?")
        params.append(date_filter)
    
    if tag_filter:
        where_clauses.append("EXISTS (SELECT 1 FROM memo_tags mt JOIN tags t ON mt.tag_id = t.id WHERE mt.memo_id = memos.id AND t.name = ?)")
        params.append(tag_filter)
    
    where_sql = ''
    if where_clauses:
        where_sql = 'WHERE ' + ' AND '.join(where_clauses)
    
    rows = db.execute(
        f'SELECT * FROM memos {where_sql} ORDER BY created_at DESC LIMIT ? OFFSET ?',
        params + [page_size, offset]
    ).fetchall()
    
    total = db.execute(f'SELECT COUNT(*) as c FROM memos {where_sql}', params).fetchone()['c']
    
    memos = [_memo_to_dict(r, db) for r in rows]
    return jsonify({
        'memos': memos,
        'page': page,
        'page_size': page_size,
        'total': total,
        'has_more': offset + len(memos) < total
    })

@bp.route('', methods=['POST'])
@require_admin
def create_memo():
    data = request.get_json()
    content = data.get('content', '').strip()
    if not content:
        return jsonify({'error': 'Content is required'}), 400
    
    db = get_db()
    title = extract_title(content)
    mood = data.get('mood', '').strip()
    word_count = len(content)
    published = 1 if data.get('published', True) else 0
    cursor = db.execute('INSERT INTO memos (content, title, mood, word_count, published) VALUES (?, ?, ?, ?, ?)', (content, title, mood or None, word_count, published))
    memo_id = cursor.lastrowid
    _update_tags(db, memo_id, content)
    db.commit()
    
    row = db.execute('SELECT * FROM memos WHERE id = ?', (memo_id,)).fetchone()
    return jsonify(_memo_to_dict(row, db)), 201

@bp.route('/<int:id>', methods=['GET'])
def get_memo(id):
    db = get_db()
    row = db.execute('SELECT * FROM memos WHERE id = ?', (id,)).fetchone()
    if not row:
        return jsonify({'error': 'Not found'}), 404
    db.execute('UPDATE memos SET read_count = read_count + 1 WHERE id = ?', (id,))
    db.commit()
    row = db.execute('SELECT * FROM memos WHERE id = ?', (id,)).fetchone()
    return jsonify(_memo_to_dict(row, db))

@bp.route('/<int:id>', methods=['PUT'])
@require_admin
def update_memo(id):
    data = request.get_json()
    content = data.get('content', '').strip()
    if not content:
        return jsonify({'error': 'Content is required'}), 400
    
    db = get_db()
    row = db.execute('SELECT * FROM memos WHERE id = ?', (id,)).fetchone()
    if not row:
        return jsonify({'error': 'Not found'}), 404
    
    title = extract_title(content)
    mood = data.get('mood', '').strip()
    word_count = len(content)
    published = 1 if data.get('published', True) else 0
    db.execute('UPDATE memos SET content = ?, title = ?, mood = ?, word_count = ?, published = ?, updated_count = updated_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', (content, title, mood or None, word_count, published, id))
    _update_tags(db, id, content)
    db.commit()
    
    row = db.execute('SELECT * FROM memos WHERE id = ?', (id,)).fetchone()
    return jsonify(_memo_to_dict(row, db))

@bp.route('/<int:id>', methods=['DELETE'])
@require_admin
def delete_memo(id):
    db = get_db()
    row = db.execute('SELECT * FROM memos WHERE id = ?', (id,)).fetchone()
    if not row:
        return jsonify({'error': 'Not found'}), 404
    db.execute('DELETE FROM memos WHERE id = ?', (id,))
    db.commit()
    return jsonify({'message': 'Deleted'})
