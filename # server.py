# server.py
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/', methods=['GET'])
def home():
    return "Welcome to the Contact Page"

@app.route('/contact', methods=['POST'])
def contact():
    try:
        data = request.get_json()

        if not data or 'name' not in data or 'email' not in data or 'message' not in data:
            return jsonify({
                'success': False,
                'message': 'Missing required fields',
                'error': 'Name, email, and message are required'
            }), 400

        # Here you would typically process the data (e.g., send email)
        # For now, we'll just simulate a successful response
        return jsonify({
            'success': True,
            'message': 'Message received successfully!',
            'data': {
                'name': data.name,
                'email': data.email,
                'message': data.message
            }
        }), 200

    except Exception as e:
        app.logger.error(f"Error processing contact request: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while processing your message',
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True)
```