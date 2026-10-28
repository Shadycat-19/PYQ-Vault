import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = 'local-dev-secret-key'
    SQLALCHEMY_DATABASE_URI =f'sqlite:///{os.path.join(BASE_DIR, "pyq.db")}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'static', 'uploads')
    PAPERS_UPLOAD_DIR = os.path.join(UPLOAD_FOLDER, 'papers')
    SOLUTIONS_UPLOAD_DIR = os.path.join(UPLOAD_FOLDER, 'solutions')
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'pdf', 'docx', 'doc', 'txt'}
    MAX_CONTENT_LENGTH = 64 * 1024 * 1024
