from flask import Flask, request, send_file, render_template, redirect, url_for, flash, jsonify
import io
import os
import secrets
from werkzeug.utils import secure_filename
from flask_wtf.csrf import CSRFProtect
import logging
from logging.handlers import RotatingFileHandler

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

def secure_key_from_password(password):
    """Generate a more secure key from the password"""
    # This is still relatively basic, but better than a simple sum
    key = 0
    for i, char in enumerate(password):
        key ^= ((ord(char) << (i % 4)) & 0xFF)
    return key

def xor_encrypt_decrypt_binary(data, password):
    """Encrypt or decrypt binary data using XOR with password-derived key"""
    key = secure_key_from_password(password)
    return bytes([b ^ key for b in data])

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
            result_data = xor_encrypt_decrypt_binary(file_data, password)
            
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
        
        # For text processing, we'll return the result via the template
        # The actual encryption/decryption is handled in JavaScript
        return render_template('index.html', result_text=text, mode=mode)
    
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

