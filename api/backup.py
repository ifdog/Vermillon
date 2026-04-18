import io
import json
import zipfile
import os
from flask import Blueprint, send_file, g
from db import get_db
from utils import require_admin
from config import DATABASE, UPLOAD_FOLDER

bp = Blueprint('backup', __name__, url_prefix='/api')


def _memo_to_export_dict(row):
    return {
        'id': row['id'],
        'title': row['title'],
        'content': row['content'],
        'slug': row['slug'],
        'word_count': row['word_count'],
        'read_count': row['read_count'],
        'published': row['published'],
        'pinned': row['pinned'],
        'created_at': row['created_at'],
        'updated_at': row['updated_at'],
    }


@bp.route('/memos/export', methods=['GET'])
@require_admin
def export_all_memos():
    fmt = g.get('format') or request.args.get('format', 'md')
    db = get_db()
    rows = db.execute(
        'SELECT * FROM memos ORDER BY created_at DESC'
    ).fetchall()

    if fmt == 'json':
        data = [_memo_to_export_dict(r) for r in rows]
        buf = io.BytesIO(json.dumps(data, ensure_ascii=False, indent=2).encode('utf-8'))
        return send_file(buf, mimetype='application/json', download_name='memos.json')

    # Markdown ZIP export
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
        for row in rows:
            slug = row['slug'] or f'memo-{row["id"]}'
            filename = f'{slug}.md'
            frontmatter = f"""---
title: {row['title'] or '(无标题)'}
slug: {slug}
date: {row['created_at']}
updated: {row['updated_at']}
word_count: {row['word_count']}
read_count: {row['read_count']}
published: {row['published']}
pinned: {row['pinned']}
---

{row['content']}
"""
            zf.writestr(filename, frontmatter.encode('utf-8'))
    buf.seek(0)
    return send_file(buf, mimetype='application/zip', download_name='memos.zip')


@bp.route('/memos/<int:id>/export', methods=['GET'])
@require_admin
def export_single_memo(id):
    fmt = request.args.get('format', 'md')
    db = get_db()
    row = db.execute('SELECT * FROM memos WHERE id = ?', (id,)).fetchone()
    if not row:
        return jsonify({'error': 'Not found'}), 404

    if fmt == 'json':
        data = _memo_to_export_dict(row)
        buf = io.BytesIO(json.dumps(data, ensure_ascii=False, indent=2).encode('utf-8'))
        return send_file(buf, mimetype='application/json', download_name=f'{row["slug"] or row["id"]}.json')

    # Markdown single export
    slug = row['slug'] or f'memo-{row["id"]}'
    content = f"""---
title: {row['title'] or '(无标题)'}
slug: {slug}
date: {row['created_at']}
updated: {row['updated_at']}
word_count: {row['word_count']}
read_count: {row['read_count']}
published: {row['published']}
pinned: {row['pinned']}
---

{row['content']}
"""
    buf = io.BytesIO(content.encode('utf-8'))
    return send_file(buf, mimetype='text/markdown', download_name=f'{slug}.md')


@bp.route('/backup', methods=['GET'])
@require_admin
def backup_database():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.write(DATABASE, arcname='vermillon.db')
    buf.seek(0)
    return send_file(buf, mimetype='application/zip', download_name=f'vermillon-backup.zip')
