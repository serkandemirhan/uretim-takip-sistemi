from flask import Flask
from flask_cors import CORS
from app.config import Config
from app.models.database import get_connection_pool, close_connection_pool
import atexit
import logging

logger = logging.getLogger(__name__)

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Connection pool'u başlangıçta oluştur
    try:
        get_connection_pool()
        logger.info("✅ Database connection pool initialized successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize connection pool: {e}")
        raise

    # Uygulama kapanırken pool'u temizle
    @atexit.register
    def cleanup():
        close_connection_pool()

    # CORS - Tüm origin'lere izin ver (development için)
    # max_age: Preflight response cache süresi (saniye) - performance için 1 saat
    CORS(app,
         resources={r"/api/*": {"origins": "*"}},
         supports_credentials=False,
         allow_headers=["Content-Type", "Authorization"],
         methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
         expose_headers=["Content-Type", "Authorization"],
         max_age=3600  # Preflight cache 1 saat
    )
    
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
    from app.routes.user_roles import user_roles_bp
    from app.routes.permissions import permissions_bp
    from app.routes.health import health_bp
    from app.routes.stocks import stocks_bp
    from app.routes.stock_movements import stock_movements_bp
    from app.routes.purchase_orders import purchase_orders_bp
    from app.routes.currency_settings import currency_settings_bp
    from app.routes.units import units_bp
    from app.routes.quotations import quotations_bp
    from app.routes.purchase_requests import purchase_requests_bp
    from app.routes.goods_receipts import goods_receipts_bp
    from app.routes.job_materials import job_materials_bp
    from app.routes.stock_field_settings import stock_field_settings_bp

    app.register_blueprint(health_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(user_roles_bp)
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
    app.register_blueprint(permissions_bp)
    app.register_blueprint(stocks_bp)
    app.register_blueprint(stock_movements_bp)
    app.register_blueprint(purchase_orders_bp)
    app.register_blueprint(currency_settings_bp)
    app.register_blueprint(quotations_bp)
    app.register_blueprint(units_bp)
    app.register_blueprint(purchase_requests_bp)
    app.register_blueprint(goods_receipts_bp)
    app.register_blueprint(job_materials_bp)
    app.register_blueprint(stock_field_settings_bp)

    # Root endpoint
    @app.route('/', methods=['GET'])
    def index():
        return {
            'message': 'Reklam Yönetim Sistemi API',
            'version': '1.0.0',
            'endpoints': {
                'health': '/api/health',
                'db_health': '/api/health/db',
                'db_test': '/api/health/db/test'
            }
        }, 200

    return app
