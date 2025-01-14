from flask import Flask, request, jsonify
from waitress import serve
import sqlite3
import base64
import os.path
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

app = Flask(__name__)

# Initialize the database
DB_FILE = "emails.db"
TABLE_NAME = "emails"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS {TABLE_NAME} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT,
            message TEXT
        )
    """)
    conn.commit()
    conn.close()

# Gmail API Setup
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']
CREDENTIALS_FILE = 'credentials.json'  # Update this with your Gmail API credentials file

def get_python_labeled_emails():
    """Fetch emails labeled 'Python' using the Gmail API."""
    try:
        creds = Credentials.from_authorized_user_file(CREDENTIALS_FILE, SCOPES)
        service = build('gmail', 'v1', credentials=creds)

        # List messages with the label "Python"
        results = service.users().messages().list(userId='me', labelIds=['Python']).execute()
        messages = results.get('messages', [])

        collected_data = []

        for message in messages:
            msg = service.users().messages().get(userId='me', id=message['id']).execute()
            payload = msg.get('payload', {})
            headers = payload.get('headers', [])

            # Extract name, email, and message content
            name, email, message_content = None, None, None

            for header in headers:
                if header['name'] == 'From':
                    email_data = header['value']
                    name = email_data.split('<')[0].strip()
                    email = email_data.split('<')[1].strip('>')

            if payload.get('body', {}).get('data'):
                message_content = base64.urlsafe_b64decode(
                    payload['body']['data'].encode('UTF-8')
                ).decode('UTF-8')

            if name and email and message_content:
                collected_data.append((name, email, message_content))

        return collected_data

    except HttpError as error:
        print(f'An error occurred: {error}')
        return []

# Save collected emails to the database
def save_to_db(data):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.executemany(f"""
        INSERT INTO {TABLE_NAME} (name, email, message) VALUES (?, ?, ?)
    """, data)
    conn.commit()
    conn.close()

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

@app.route('/sync_emails', methods=['GET'])
def sync_emails():
    """Sync emails labeled 'Python' to the database."""
    emails = get_python_labeled_emails()
    if not emails:
        return jsonify({'message': 'No new emails found with the label "Python".'}), 200

    save_to_db(emails)
    return jsonify({'message': f'{len(emails)} emails synced successfully.'}), 200

if __name__ == '__main__':
    init_db()
    serve(app, host='0.0.0.0', port=5000)
