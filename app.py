from flask import Flask, request, jsonify
from flask_cors import CORS
from waitress import serve
import sqlite3
import imaplib
import email
from email.header import decode_header
import logging
from email.utils import parseaddr
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Custom app name
APP_NAME = "AerosSpace"  # Change this to your desired name
app = Flask(APP_NAME)  # Create a Flask app

# Allow CORS for specific origins and include credentials support
CORS(
    app,
    origins=[os.getenv('CORS_ORIGIN', 'http://localhost:3000')],  # Use environment variable for CORS origin
    supports_credentials=True
)

# Secure configuration for Database and IMAP
DB_FILE = os.getenv('DB_FILE')
if not DB_FILE:
    raise ValueError("DB_FILE not set in environment variables")

TABLE_NAME = "emails"
IMAP_SERVER = os.getenv('IMAP_SERVER', 'imap.gmail.com')
EMAIL_USER = os.getenv('lexyloveonme@gmail.com') # Use environment variable for email user
EMAIL_PASS = os.getenv('booj auia vqzr urbw') # Use environment variable for email password

if not all([IMAP_SERVER, EMAIL_USER, EMAIL_PASS]):
    raise ValueError("IMAP_SERVER, EMAIL_USER, or EMAIL_PASS not set in environment variables")

def init_db():
    try:
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
        logger.info("Database initialized successfully.")
    except sqlite3.Error as e:
        logger.error(f"Database initialization error: {e}")
    finally:
        conn.close()

def get_python_labeled_emails():
    """Fetch emails labeled 'Python' using IMAP."""
    try:
        conn = imaplib.IMAP4_SSL(IMAP_SERVER)
        conn.login(EMAIL_USER, EMAIL_PASS)
        conn.select("inbox")

        # Search for emails with "Python" in the subject
        status, messages = conn.search(None, 'SUBJECT "Python"')
        if status != "OK":
            logger.warning("No emails found.")
            return []

        email_ids = messages[0].split()
        collected_data = []

        for email_id in email_ids:
            res, msg_data = conn.fetch(email_id, "(RFC822)")
            for response_part in msg_data:
                if isinstance(response_part, tuple):
                    msg = email.message_from_bytes(response_part[1])

                    # Decode email subject
                    subject, encoding = decode_header(msg["Subject"])[0]
                    if isinstance(subject, bytes):
                        subject = subject.decode(encoding if encoding else "utf-8")

                    # Extract sender information
                    from_ = msg.get("From")
                    name, sender_email = parseaddr(from_)

                    # Extract email content
                    body = ""
                    if msg.is_multipart():
                        for part in msg.walk():
                            content_type = part.get_content_type()
                            content_disposition = str(part.get("Content-Disposition"))

                            if content_type == "text/plain" and "attachment" not in content_disposition:
                                body = part.get_payload(decode=True).decode("utf-8")
                                break
                    else:
                        body = msg.get_payload(decode=True).decode("utf-8")

                    if name and sender_email and body:
                        collected_data.append((name, sender_email, body))

        conn.logout()
        return collected_data

    except Exception as e:
        logger.error(f"Error fetching emails: {e}")
        return []

def save_to_db(data):
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.executemany(f"""
            INSERT INTO {TABLE_NAME} (name, email, message) VALUES (?, ?, ?)
        """, data)
        conn.commit()
        logger.info(f"Saved {len(data)} emails to the database.")
    except sqlite3.Error as e:
        logger.error(f"Database error: {e}")
    finally:
        conn.close()

@app.route('/contact', methods=['POST', 'OPTIONS'])
def contact():
    if request.method == 'OPTIONS':
        # Handle preflight requests
        response = jsonify({'message': 'CORS preflight handled'})
        response.headers.add('Access-Control-Allow-Origin', os.getenv('CORS_ORIGIN', 'http://localhost:3000'))
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 200

    data = request.get_json()

    # Validate incoming data
    name = data.get('name')
    email = data.get('email')
    message = data.get('message')

    if not name or not email or not message:
        return jsonify({'error': 'Missing fields'}), 400

    if '@' not in parseaddr(email)[1]:
        return jsonify({'error': 'Invalid email address'}), 400

    # Handle the data (e.g., save to a database or send an email)
    logger.info(f"Message received from {name} ({email}): {message}")

    return jsonify({'message': 'Your message has been received!'}), 200

@app.route('/sync_emails', methods=['GET'])
def sync_emails():
    """Sync emails labeled 'Python' to the database."""
    api_key = request.headers.get('X-API-KEY')
    if api_key != os.getenv('SYNC_API_KEY', 'default-key'):
        logger.warning("Unauthorized access to /sync_emails")
        return jsonify({'error': 'Unauthorized'}), 401

    emails = get_python_labeled_emails()
    if not emails:
        return jsonify({'message': 'No new emails found with the label "Python".'}), 200

    save_to_db(emails)
    return jsonify({'message': f'{len(emails)} emails synced successfully.'}), 200

if __name__ == '__main__':
    init_db()
    serve(app, host='0.0.0.0', port=int(os.getenv('PORT', 5000)))
