import bcrypt
from flask import Blueprint, request, jsonify, session
from db import get_db
from utils import require_admin

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '')
    
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
    
    if user and bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
        session['user_id'] = user['id']
        session['username'] = user['username']
        return jsonify({'message': 'OK', 'username': user['username']})
    
    return jsonify({'error': 'Invalid username or password'}), 401

@bp.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logged out'})

@bp.route('/change-password', methods=['POST'])
@require_admin
def change_password():
    data = request.get_json()
    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '')
    
    if not current_password or not new_password:
        return jsonify({'error': 'Current and new password required'}), 400
    
    if len(new_password) < 4:
        return jsonify({'error': 'New password too short'}), 400
    
    db = get_db()
    user_id = session.get('user_id')
    user = db.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    
    if not user or not bcrypt.checkpw(current_password.encode('utf-8'), user['password_hash'].encode('utf-8')):
        return jsonify({'error': 'Current password incorrect'}), 403
    
    new_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    db.execute('UPDATE users SET password_hash = ? WHERE id = ?', (new_hash, user_id))
    db.commit()
    
    return jsonify({'message': 'Password updated'})

@bp.route('/me', methods=['GET'])
def me():
    if session.get('user_id'):
        return jsonify({'logged_in': True, 'username': session.get('username')})
    return jsonify({'logged_in': False}), 401
