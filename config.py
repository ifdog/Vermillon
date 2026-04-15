import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE = os.path.join(BASE_DIR, 'vermillon.db')
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'static', 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'mov', 'mp3', 'pdf', 'txt'}
ADMIN_KEY = os.environ.get('ADMIN_KEY', 'dev-key-change-in-production')
PAGE_SIZE = 20

def ensure_upload_folder():
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
