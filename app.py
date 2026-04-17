import os
import subprocess
from flask import Flask, send_from_directory, request, jsonify, render_template
from db import init_db, close_db
from config import UPLOAD_FOLDER, SECRET_KEY, ensure_upload_folder
from api import memos, tags, search, calendar, upload, auth, settings, stats

def get_site_title():
    try:
        from db import get_db
        db = get_db()
        row = db.execute('SELECT value FROM site_settings WHERE key = ?', ('site_title',)).fetchone()
        return row['value'] if row else 'Vermillon'
    except Exception:
        return 'Vermillon'

def create_app():
    app = Flask(__name__, static_folder='static', template_folder='templates')
    app.secret_key = SECRET_KEY
    ensure_upload_folder()
    init_db(app)
    
    app.teardown_appcontext(close_db)
    
    app.register_blueprint(memos.bp)
    app.register_blueprint(tags.bp)
    app.register_blueprint(search.bp)
    app.register_blueprint(calendar.bp)
    app.register_blueprint(upload.bp)
    app.register_blueprint(auth.bp)
    app.register_blueprint(settings.bp)
    app.register_blueprint(stats.bp)
    
    @app.route('/uploads/<path:filename>')
    def uploaded_file(filename):
        return send_from_directory(UPLOAD_FOLDER, filename)
    
    @app.route('/')
    def index():
        from api.stats import record_visit
        record_visit('/', request.remote_addr, request.user_agent.string[:200] if request.user_agent else None)
        return render_template('index.html', site_title=get_site_title())
    
    @app.route('/write')
    def write_page():
        return render_template('write.html', site_title=get_site_title())
    
    @app.route('/edit/<int:id>')
    def edit_page(id):
        return render_template('write.html', site_title=get_site_title())
    
    @app.route('/admin')
    def admin_page():
        return render_template('admin.html', site_title=get_site_title())
    
    @app.route('/login')
    def login_page():
        return render_template('login.html', site_title=get_site_title())
    
    @app.route('/api/version')
    def version():
        commit = 'unknown'
        version_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'version.txt')
        if os.path.exists(version_file):
            with open(version_file, 'r') as f:
                commit = f.read().strip() or 'unknown'
        if commit == 'unknown':
            try:
                commit = subprocess.check_output(['git', 'rev-parse', '--short', 'HEAD']).decode('utf-8').strip()
            except Exception:
                commit = 'unknown'
        return jsonify({'version': commit})
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)
