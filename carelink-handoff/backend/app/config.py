import os
from dotenv import load_dotenv

load_dotenv()  # reads the .env file

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
DATABASE_URL = os.getenv("CARELINK_DATABASE_URL", "sqlite:///./carelink.db")
UPLOAD_DIR = os.getenv("CARELINK_UPLOAD_DIR", "uploads")
