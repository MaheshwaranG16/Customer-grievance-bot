from flask_sqlalchemy import SQLAlchemy
import os

# Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:4178@localhost:5432/grievance_db")

# Initialize SQLAlchemy
db = SQLAlchemy()
Base = db.Model
