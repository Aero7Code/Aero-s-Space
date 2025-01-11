from flask import Flask, request, jsonify
from waitress import serve

app = Flask(__name__)

@app.route('/contact', methods=['POST'])
def contact():
    data = request.get_json()

    # Validate incoming data
    name = data.get('name')
    email = data.get('email')
    message = data.get('message')

    if not name or not email or not message:
        return jsonify({'error': 'Missing fields'}), 400

    # Handle the data (e.g., save to a database or send an email)
    print(f"Message received from {name} ({email}): {message}")

    return jsonify({'message': 'Your message has been received!'}), 200

if __name__ == '__main__':
    serve(app, host='0.0.0.0', port=5000)
