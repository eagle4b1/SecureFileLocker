from flask import Flask, request, send_file, render_template, redirect, url_for, flash, jsonify
import io
import os
import secrets
from werkzeug.utils import secure_filename
from flask_wtf.csrf import CSRFProtect
import logging
from logging.handlers import RotatingFileHandler
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.backends import default_backend
import base64
import hashlib

# Configure application
app = Flask(__name__)
app.config['SECRET_KEY'] = secrets.token_hex(16)  # Generate a secure random key
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # Limit file size to 16MB
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'temp')
app.config['ALLOWED_EXTENSIONS'] = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx', 'xlsx', 'zip'}

# Set up CSRF protection
csrf = CSRFProtect(app)

# Set up logging
if not os.path.exists('logs'):
    os.mkdir('logs')
file_handler = RotatingFileHandler('logs/securefile.log', maxBytes=10240, backupCount=10)
file_handler.setFormatter(logging.Formatter(
    '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
))
file_handler.setLevel(logging.INFO)
app.logger.addHandler(file_handler)
app.logger.setLevel(logging.INFO)
app.logger.info('SecureFileLocker startup')

# Create temp folder if it doesn't exist
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

def allowed_file(filename):
    """Check if the file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def derive_key_and_iv(password):
    """Derive a key and IV from the password using a secure method"""
    password_bytes = password.encode('utf-8')
    # Use SHA-256 to create a 32-byte key (256 bits for AES-256)
    key = hashlib.sha256(password_bytes).digest()
    # Use the first 16 bytes of SHA-1 hash as IV
    iv = hashlib.sha1(password_bytes).digest()[:16]
    return key, iv

def aes_encrypt(data, password):
    """Encrypt data using AES"""
    key, iv = derive_key_and_iv(password)
    padder = padding.PKCS7(algorithms.AES.block_size).padder()
    padded_data = padder.update(data) + padder.finalize()
    
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    encrypted_data = encryptor.update(padded_data) + encryptor.finalize()
    
    # Prepend IV to encrypted data for decryption later
    return iv + encrypted_data

def aes_decrypt(data, password):
    """Decrypt data using AES"""
    if len(data) < 16:  # IV size is 16 bytes
        raise ValueError("Input data is too short to contain an IV")
    
    # Extract IV from the beginning of the data
    iv = data[:16]
    encrypted_data = data[16:]
    
    key, _ = derive_key_and_iv(password)
    
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    decryptor = cipher.decryptor()
    padded_data = decryptor.update(encrypted_data) + decryptor.finalize()
    
    unpadder = padding.PKCS7(algorithms.AES.block_size).unpadder()
    original_data = unpadder.update(padded_data) + unpadder.finalize()
    
    return original_data

def encrypt_text_for_display(text, password):
    """Encrypt text and return base64 encoded string for display"""
    text_bytes = text.encode('utf-8')
    encrypted = aes_encrypt(text_bytes, password)
    return base64.b64encode(encrypted).decode('utf-8')

def decrypt_text_from_display(encrypted_text, password):
    """Decrypt base64 encoded encrypted text"""
    try:
        encrypted_bytes = base64.b64decode(encrypted_text)
        decrypted_bytes = aes_decrypt(encrypted_bytes, password)
        return decrypted_bytes.decode('utf-8')
    except Exception as e:
        app.logger.error(f"Decryption error: {str(e)}")
        raise ValueError("Failed to decrypt. Incorrect password or invalid data format.")

@app.route("/", methods=["GET"])
def index():
    """Render the main page"""
    return render_template("index.html")

@app.route("/process_file", methods=["POST"])
def process_file():
    """Process file encryption/decryption"""
    try:
        # Check if the post request has the file part
        if 'file' not in request.files:
            flash('No file part', 'error')
            return redirect(request.url)

        file = request.files['file']
        # If user does not select file, browser also
        # submit an empty part without filename
        if file.filename == '':
            flash('No selected file', 'error')
            return redirect(request.url)
        
        password = request.form.get('password', '')
        if not password:
            flash('Password is required', 'error')
            return redirect(request.url)

        mode = request.form.get('mode', 'encrypt')

        # Validate the file
        if file and allowed_file(file.filename):
            # Get file data and process it
            file_data = file.read()
            
            if mode == 'encrypt':
                result_data = aes_encrypt(file_data, password)
            else:  # decrypt
                try:
                    result_data = aes_decrypt(file_data, password)
                except Exception as e:
                    flash(f"Decryption failed: {str(e)}. Check your password or file format.", 'error')
                    return redirect(url_for('index'))

            # Create a BytesIO object for the result
            result_file = io.BytesIO(result_data)
            result_file.seek(0)

            # Generate a secure filename
            filename = secure_filename(file.filename)
            output_filename = f"{'encrypted' if mode == 'encrypt' else 'decrypted'}_{filename}"

            app.logger.info(f"Successfully processed file: {filename} using mode: {mode}")

            # Return the file for download
            return send_file(
                result_file,
                as_attachment=True,
                download_name=output_filename,
                mimetype='application/octet-stream'
            )
        else:
            flash('File type not allowed', 'error')
            return redirect(request.url)

    except Exception as e:
        app.logger.error(f"Error processing file: {str(e)}")
        flash(f"An error occurred: {str(e)}", 'error')
        return redirect(url_for('index'))

@app.route("/process_text", methods=["POST"])
def process_text():
    """Process text encryption/decryption"""
    try:
        text = request.form.get('text', '')
        password = request.form.get('password', '')
        mode = request.form.get('mode', 'encrypt')

        if not text:
            flash('Text is required', 'error')
            return redirect(url_for('index'))

        if not password:
            flash('Password is required', 'error')
            return redirect(url_for('index'))

        result = ""
        if mode == 'encrypt':
            result = encrypt_text_for_display(text, password)
        else:  # decrypt
            try:
                result = decrypt_text_from_display(text, password)
            except ValueError as e:
                flash(str(e), 'error')
                return redirect(url_for('index'))

        # Return the processed text via the template
        return render_template('index.html', 
                              result_text=result, 
                              original_text=text,
                              mode=mode)

    except Exception as e:
        app.logger.error(f"Error processing text: {str(e)}")
        flash(f"An error occurred: {str(e)}", 'error')
        return redirect(url_for('index'))

@app.errorhandler(404)
def not_found_error(error):
    """Handle 404 errors"""
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    app.logger.error(f"Server Error: {str(error)}")
    return render_template('500.html'), 500

@app.errorhandler(413)
def request_entity_too_large(error):
    """Handle file too large errors"""
    flash('File too large. Maximum size is 16MB', 'error')
    return redirect(url_for('index'))

# Health check endpoint
@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy"}), 200

if __name__ == "__main__":
    app.run(debug=False)
