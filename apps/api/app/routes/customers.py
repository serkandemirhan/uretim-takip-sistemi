from flask import Blueprint, request, jsonify
from app.models.database import execute_query
from app.middleware.auth_middleware import token_required

customers_bp = Blueprint('customers', __name__, url_prefix='/api/customers')

@customers_bp.route('', methods=['GET'])
@token_required
def get_customers():
    """Tüm müşterileri listele"""
    try:
        query = """
            SELECT id, name, contact_person, phone, email, address
            FROM customers
            WHERE is_active = true
            ORDER BY name
        """
        customers = execute_query(query)
        
        customers_list = []
        for customer in customers:
            customers_list.append({
                'id': str(customer['id']),
                'name': customer['name'],
                'contact_person': customer['contact_person'],
                'phone': customer['phone'],
                'email': customer['email'],
                'address': customer['address']
            })
        
        return jsonify({'data': customers_list}), 200
        
    except Exception as e:
        return jsonify({'error': f'Bir hata oluştu: {str(e)}'}), 500