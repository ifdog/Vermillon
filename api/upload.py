import uuid
import os
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from db import get_db
from utils import require_admin, allowed_file
from config import UPLOAD_FOLDER, ALLOWED_EXTENSIONS, PAGE_SIZE

bp = Blueprint('upload', __name__, url_prefix='/api/upload')

@bp.route('', methods=['POST'])
@require_admin
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename, ALLOWED_EXTENSIONS):
        ext = file.filename.rsplit('.', 1)[1].lower()
        filename = f"{uuid.uuid4().hex}.{ext}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        memo_id = request.form.get('memo_id', type=int)
        db = get_db()
        db.execute(
            'INSERT INTO attachments (memo_id, filename, original_name, mime_type, size) VALUES (?, ?, ?, ?, ?)',
            (memo_id, filename, secure_filename(file.filename), file.content_type, os.path.getsize(filepath))
        )
        db.commit()
        
        return jsonify({
            'url': f'/uploads/{filename}',
            'filename': filename,
            'original_name': secure_filename(file.filename)
        })
    
    return jsonify({'error': 'File type not allowed'}), 400


@bp.route('', methods=['GET'])
@require_admin
def list_attachments():
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('pageSize', PAGE_SIZE, type=int)
    offset = (page - 1) * page_size
    db = get_db()
    rows = db.execute(
        'SELECT a.*, m.title as memo_title FROM attachments a LEFT JOIN memos m ON a.memo_id = m.id ORDER BY a.created_at DESC LIMIT ? OFFSET ?',
        (page_size, offset)
    ).fetchall()
    total = db.execute('SELECT COUNT(*) as c FROM attachments').fetchone()['c']
    return jsonify({
        'attachments': [dict(r) for r in rows],
        'page': page,
        'page_size': page_size,
        'total': total,
        'has_more': offset + len(rows) < total
    })


@bp.route('/<int:id>', methods=['DELETE'])
@require_admin
def delete_attachment(id):
    db = get_db()
    row = db.execute('SELECT * FROM attachments WHERE id = ?', (id,)).fetchone()
    if not row:
        return jsonify({'error': 'Not found'}), 404
    filepath = os.path.join(UPLOAD_FOLDER, row['filename'])
    if os.path.exists(filepath):
        os.remove(filepath)
    db.execute('DELETE FROM attachments WHERE id = ?', (id,))
    db.commit()
    return jsonify({'message': 'Deleted'})


@bp.route('/orphans', methods=['GET'])
@require_admin
def list_orphans():
    db = get_db()
    rows = db.execute(
        'SELECT * FROM attachments WHERE memo_id IS NULL ORDER BY created_at DESC'
    ).fetchall()
    return jsonify({'attachments': [dict(r) for r in rows]})


@bp.route('/orphans', methods=['DELETE'])
@require_admin
def delete_orphans():
    db = get_db()
    rows = db.execute('SELECT * FROM attachments WHERE memo_id IS NULL').fetchall()
    deleted = 0
    for row in rows:
        filepath = os.path.join(UPLOAD_FOLDER, row['filename'])
        if os.path.exists(filepath):
            os.remove(filepath)
        db.execute('DELETE FROM attachments WHERE id = ?', (row['id'],))
        deleted += 1
    db.commit()
    return jsonify({'message': f'Deleted {deleted} orphan files'})
