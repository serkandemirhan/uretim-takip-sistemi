from flask import Flask
from flask_cors import CORS
from app.config import Config

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    

    # CORS - Tüm origin'lere izin ver (development için)
    CORS(app, resources={
        r"/api/*": {
            "origins": "*",
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })
    
    # Routes
    from app.routes.auth import auth_bp
    from app.routes.jobs import jobs_bp
    from app.routes.machines import machines_bp
    from app.routes.customers import customers_bp
    from app.routes.processes import processes_bp
    from app.routes.tasks import tasks_bp
    from app.routes.dashboard import dashboard_bp
    from app.routes.files import files_bp    
    from app.routes.notifications import notifications_bp
    from app.routes.roles import roles_bp
    from app.routes.users import users_bp

    app.register_blueprint(users_bp)
    app.register_blueprint(roles_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(files_bp)    
    app.register_blueprint(dashboard_bp)      
    app.register_blueprint(tasks_bp)    
    app.register_blueprint(processes_bp)    
    app.register_blueprint(customers_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(jobs_bp)
    app.register_blueprint(machines_bp)
    
    # Health check
    @app.route('/health', methods=['GET'])
    def health_check():
        return {'status': 'ok', 'message': 'API çalışıyor'}, 200
    
    @app.route('/', methods=['GET'])
    def index():
        return {'message': 'Reklam Yönetim Sistemi API', 'version': '1.0.0'}, 200
    
    return app