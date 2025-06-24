from flask import Flask
from flask_cors import CORS
from config import db, DATABASE_URL
from routes import bp
from models import *

app = Flask(__name__)
CORS(app)
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

app.register_blueprint(bp)

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5003, debug=True)
