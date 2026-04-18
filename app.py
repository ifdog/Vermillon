import os
from flask import Flask, send_from_directory, request, jsonify, render_template
from db import init_db, close_db
from config import UPLOAD_FOLDER, SECRET_KEY, ensure_upload_folder
from api import memos, tags, search, calendar, upload, auth, settings, stats, rss
from api.backup import bp as backup_bp

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
    app.register_blueprint(rss.bp)
    app.register_blueprint(backup_bp)
    
    @app.route('/robots.txt')
    def robots():
        return '''User-agent: *
Allow: /
Disallow: /admin
Disallow: /login
Disallow: /write
Disallow: /edit/
Sitemap: ''' + request.url_root.rstrip('/') + '/sitemap.xml\n'
    
    @app.route('/memo/<slug>')
    def memo_by_slug(slug):
        return render_template('index.html', site_title=get_site_title())
    
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
        return jsonify({'version': '1.3'})
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)
