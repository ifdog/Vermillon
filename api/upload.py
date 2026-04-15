import uuid
import os
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from db import get_db
from utils import require_admin, allowed_file
from config import UPLOAD_FOLDER, ALLOWED_EXTENSIONS

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
