import os
from flask import Flask, send_from_directory
from db import init_db, close_db
from config import UPLOAD_FOLDER, SECRET_KEY, ensure_upload_folder
from api import memos, tags, search, calendar, upload, auth, settings, stats

def create_app():
    app = Flask(__name__, static_folder='static')
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
        return app.send_static_file('index.html')
    
    @app.route('/write')
    def write_page():
        return app.send_static_file('write.html')
    
    @app.route('/edit/<int:id>')
    def edit_page(id):
        return app.send_static_file('write.html')
    
    @app.route('/admin')
    def admin_page():
        return app.send_static_file('admin.html')
    
    @app.route('/login')
    def login_page():
        return app.send_static_file('login.html')
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)
