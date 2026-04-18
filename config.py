import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE = os.environ.get('DATABASE_URL', os.path.join(BASE_DIR, 'vermillon.db'))
UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', os.path.join(BASE_DIR, 'static', 'uploads'))
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'mov', 'mp3', 'pdf', 'txt'}
# ADMIN_KEY 当前版本未使用，保留以供未来扩展（如 API Token 认证）
ADMIN_KEY = os.environ.get('ADMIN_KEY', '')
SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
PAGE_SIZE = 20

def ensure_upload_folder():
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
