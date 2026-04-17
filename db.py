import sqlite3
from flask import g
from config import DATABASE

def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row
    return g.db

def close_db(e=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()

def init_db(app):
    with app.app_context():
        db = get_db()
        cursor = db.cursor()
        
        cursor.executescript('''
            CREATE TABLE IF NOT EXISTS memos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL,
                title TEXT,
                mood TEXT,
                word_count INTEGER DEFAULT 0,
                read_count INTEGER DEFAULT 0,
                updated_count INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_memos_created ON memos(created_at);
            
            CREATE TABLE IF NOT EXISTS tags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL
            );
            
            CREATE TABLE IF NOT EXISTS memo_tags (
                memo_id INTEGER,
                tag_id INTEGER,
                FOREIGN KEY (memo_id) REFERENCES memos(id) ON DELETE CASCADE,
                FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
                PRIMARY KEY (memo_id, tag_id)
            );
            
            CREATE TABLE IF NOT EXISTS attachments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                memo_id INTEGER,
                filename TEXT NOT NULL,
                original_name TEXT,
                mime_type TEXT,
                size INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (memo_id) REFERENCES memos(id) ON DELETE CASCADE
            );
            
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS site_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            
            CREATE TABLE IF NOT EXISTS stats (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                total_visits INTEGER DEFAULT 0,
                index_visits INTEGER DEFAULT 0
            );
            
            CREATE TABLE IF NOT EXISTS visits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                path TEXT NOT NULL,
                ip TEXT,
                user_agent TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        ''')
        
        # Create default admin user if not exists
        admin = cursor.execute('SELECT * FROM users WHERE username = ?', ('admin',)).fetchone()
        if not admin:
            import bcrypt
            pw_hash = bcrypt.hashpw('admin'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            cursor.execute('INSERT INTO users (username, password_hash) VALUES (?, ?)', ('admin', pw_hash))
        
        # Default site title
        title = cursor.execute('SELECT * FROM site_settings WHERE key = ?', ('site_title',)).fetchone()
        if not title:
            cursor.execute('INSERT INTO site_settings (key, value) VALUES (?, ?)', ('site_title', 'Vermillon'))
        
        # Default stats row
        stats = cursor.execute('SELECT * FROM stats WHERE id = 1').fetchone()
        if not stats:
            cursor.execute('INSERT INTO stats (id, total_visits, index_visits) VALUES (1, 0, 0)')
        
        # Migrate existing databases: add metadata columns if not present
        try:
            cursor.execute('ALTER TABLE memos ADD COLUMN word_count INTEGER DEFAULT 0')
        except sqlite3.OperationalError:
            pass
        try:
            cursor.execute('ALTER TABLE memos ADD COLUMN read_count INTEGER DEFAULT 0')
        except sqlite3.OperationalError:
            pass
        try:
            cursor.execute('ALTER TABLE memos ADD COLUMN updated_count INTEGER DEFAULT 0')
        except sqlite3.OperationalError:
            pass
        
        db.commit()
