import os
from dotenv import load_dotenv

load_dotenv()  # reads the .env file

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
DATABASE_URL = "sqlite:///./carelink.db"
UPLOAD_DIR = "uploads"