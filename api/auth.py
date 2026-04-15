from flask import Blueprint, request, jsonify
from utils import require_admin

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@bp.route('', methods=['POST'])
@require_admin
def check_auth():
    return jsonify({'message': 'OK'})
