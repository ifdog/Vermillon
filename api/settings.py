from flask import Blueprint, request, jsonify
from db import get_db
from utils import require_admin

bp = Blueprint('settings', __name__, url_prefix='/api/settings')

@bp.route('', methods=['GET'])
def get_settings():
    db = get_db()
    rows = db.execute('SELECT key, value FROM site_settings').fetchall()
    return jsonify({r['key']: r['value'] for r in rows})

@bp.route('', methods=['POST'])
@require_admin
def update_settings():
    data = request.get_json()
    db = get_db()
    for key, value in data.items():
        db.execute('INSERT INTO site_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', (key, str(value)))
    db.commit()
    return jsonify({'message': 'Settings updated'})
