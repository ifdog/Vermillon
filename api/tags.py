from flask import Blueprint, jsonify
from db import get_db

bp = Blueprint('tags', __name__, url_prefix='/api/tags')

@bp.route('', methods=['GET'])
def list_tags():
    db = get_db()
    rows = db.execute('''
        SELECT t.name, COUNT(mt.memo_id) as count
        FROM tags t
        LEFT JOIN memo_tags mt ON t.id = mt.tag_id
        GROUP BY t.id
        ORDER BY t.name
    ''').fetchall()
    return jsonify({'tags': [dict(r) for r in rows]})
