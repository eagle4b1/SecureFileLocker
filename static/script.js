// DOM Elements
const fileForm = document.getElementById('file-form');
const textForm = document.getElementById('text-form');
const fileInput = document.getElementById('file-input');
const textInput = document.getElementById('text-input');
const filePassword = document.getElementById('file-password');
const textPassword = document.getElementById('text-password');
const fileError = document.getElementById('file-error');
const textError = document.getElementById('text-error');
const fileSubmitBtn = document.getElementById('file-submit-btn');
const textSubmitBtn = document.getElementById('text-submit-btn');
const fileName = document.getElementById('file-name');
const fileLoading = document.getElementById('file-loading');
const fileDropArea = document.getElementById('file-drop-area');
const fileTab = document.getElementById('file-tab');
const textTab = document.getElementById('text-tab');
const fileTabBtn = document.getElementById('file-tab-btn');
const textTabBtn = document.getElementById('text-tab-btn');
const themeToggle = document.getElementById('theme-toggle-input');
const passwordToggles = document.querySelectorAll('.password-toggle');
const copyBtn = document.getElementById('copy-btn');
const resultText = document.getElementById('result-text');

// Tab functionality
function switchTab(tab) {
  const allTabs = document.querySelectorAll('.tab-content');
  const allTabBtns = document.querySelectorAll('.tab-btn');

  // Hide all tabs
  allTabs.forEach(tab => {
    tab.classList.remove('active');
  });

  // Deactivate all tab buttons
  allTabBtns.forEach(btn => {
    btn.classList.remove('active');
    btn.setAttribute('aria-selected', 'false');
  });

  // Show the selected tab
  const selectedTab = document.getElementById(`${tab}-tab`);
  selectedTab.classList.add('active');

  // Activate the selected tab button
  const selectedBtn = document.getElementById(`${tab}-tab-btn`);
  selectedBtn.classList.add('active');
  selectedBtn.setAttribute('aria-selected', 'true');
}

// Theme toggle functionality
function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('dark-mode', document.body.classList.contains('dark-mode'));
}

// Password visibility toggle
function togglePasswordVisibility(event) {
  const passwordField = event.currentTarget.parentElement.querySelector('input');
  const icon = event.currentTarget.querySelector('i');

  if (passwordField.type === 'password') {
    passwordField.type = 'text';
    icon.classList.remove('fa-eye');
    icon.classList.add('fa-eye-slash');
  } else {
    passwordField.type = 'password';
    icon.classList.remove('fa-eye-slash');
    icon.classList.add('fa-eye');
  }
}

// Password strength checker
function checkPasswordStrength(password) {
  // Initialize strength score
  let strength = 0;

  // Check password length
  if (password.length >= 8) strength += 1;
  if (password.length >= 12) strength += 1;

  // Check for mixed case
  if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength += 1;

  // Check for numbers
  if (password.match(/\d/)) strength += 1;

  // Check for special characters
  if (password.match(/[^a-zA-Z\d]/)) strength += 1;

  // Return strength rating
  if (strength === 0) return { score: 0, text: 'Not entered' };
  if (strength <= 2) return { score: 1, text: 'Weak' };
  if (strength <= 3) return { score: 2, text: 'Medium' };
  if (strength <= 4) return { score: 3, text: 'Strong' };
  return { score: 4, text: 'Very Strong' };
}

// Update password strength indicator
function updatePasswordStrength(password, container) {
  const strengthBar = container.querySelector('.strength-indicator');
  const strengthText = container.querySelector('.strength-text');
  const strength = checkPasswordStrength(password);

  // Remove all classes
  container.classList.remove('strength-weak', 'strength-medium', 'strength-strong', 'strength-very-strong');

  // Add appropriate class based on strength
  if (strength.score === 1) container.classList.add('strength-weak');
  if (strength.score === 2) container.classList.add('strength-medium');
  if (strength.score === 3) container.classList.add('strength-strong');
  if (strength.score === 4) container.classList.add('strength-very-strong');

  // Update text
  strengthText.textContent = `Password strength: ${strength.text}`;
}

// File upload functionality
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    displayFileName(file);
  }
}

// Display file name
function displayFileName(file) {
  fileName.textContent = `Selected file: ${file.name} (${formatFileSize(file.size)})`;
  fileName.style.display = 'block';
  fileError.textContent = '';
  fileError.classList.remove('visible');
}

// Format file size
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' bytes';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  else return (bytes / 1048576).toFixed(1) + ' MB';
}

// Drag and drop functionality
function handleDragOver(event) {
  event.preventDefault();
  fileDropArea.classList.add('highlight');
}

function handleDragLeave() {
  fileDropArea.classList.remove('highlight');
}

function handleDrop(event) {
  event.preventDefault();
  fileDropArea.classList.remove('highlight');

  if (event.dataTransfer.files.length) {
    fileInput.files = event.dataTransfer.files;
    displayFileName(event.dataTransfer.files[0]);
  }
}

// Form validation
function validateFileForm() {
  let isValid = true;

  // Check if file is selected
  if (!fileInput.files.length) {
    fileError.textContent = 'Please select a file to process';
    fileError.classList.add('visible');
    isValid = false;
  }

  // Check if password is entered
  if (!filePassword.value.trim()) {
    const strengthContainer = document.getElementById('password-strength-file');
    const strengthText = strengthContainer.querySelector('.strength-text');
    strengthText.textContent = 'Password strength: Not entered';
    strengthContainer.classList.remove('strength-weak', 'strength-medium', 'strength-strong', 'strength-very-strong');
    fileError.textContent = 'Please enter a password';
    fileError.classList.add('visible');
    isValid = false;
  }

  return isValid;
}

function validateTextForm() {
  let isValid = true;

  // Check if text is entered
  if (!textInput.value.trim()) {
    textError.textContent = 'Please enter text to process';
    textError.classList.add('visible');
    isValid = false;
  }

  // Check if password is entered
  if (!textPassword.value.trim()) {
    const strengthContainer = document.getElementById('password-strength-text');
    const strengthText = strengthContainer.querySelector('.strength-text');
    strengthText.textContent = 'Password strength: Not entered';
    strengthContainer.classList.remove('strength-weak', 'strength-medium', 'strength-strong', 'strength-very-strong');
    textError.textContent = 'Please enter a password';
    textError.classList.add('visible');
    isValid = false;
  }

  return isValid;
}

// AES Crypto functions - Using SubtleCrypto API
async function deriveKeyAndIV(password) {
  // Convert password to UTF-8
  const passwordBytes = new TextEncoder().encode(password);
  
  // Using SHA-256 for key (same as in Python)
  const keyBuffer = await crypto.subtle.digest('SHA-256', passwordBytes);
  
  // Using first 16 bytes of SHA-1 hash for IV (same as in Python)
  const ivArrayBuffer = await crypto.subtle.digest('SHA-1', passwordBytes);
  const iv = new Uint8Array(ivArrayBuffer).slice(0, 16);
  
  return { key: new Uint8Array(keyBuffer), iv };
}

async function aesEncrypt(text, password) {
  try {
    // Convert text to UTF-8 bytes
    const data = new TextEncoder().encode(text);
    
    // Get key and IV from password
    const { key, iv } = await deriveKeyAndIV(password);
    
    // Import the raw key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'AES-CBC' },
      false,
      ['encrypt']
    );
    
    // Add PKCS7 padding
    const paddedData = addPKCS7Padding(data);
    
    // Encrypt the data
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-CBC', iv },
      cryptoKey,
      paddedData
    );
    
    // Concatenate IV and encrypted data (as Python does)
    const result = new Uint8Array(iv.length + encryptedData.byteLength);
    result.set(iv);
    result.set(new Uint8Array(encryptedData), iv.length);
    
    // Return base64 encoded result
    return btoa(
      Array.from(result)
        .map(byte => String.fromCharCode(byte))
        .join('')
    );
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Encryption failed. Please try again.');
  }
}

async function aesDecrypt(encryptedBase64, password) {
  try {
    // Decode base64 to bytes
    const encryptedBytes = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
    
    // Extract IV (first 16 bytes)
    const iv = encryptedBytes.slice(0, 16);
    const encryptedData = encryptedBytes.slice(16);
    
    // Get key from password
    const { key } = await deriveKeyAndIV(password);
    
    // Import the raw key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'AES-CBC' },
      false,
      ['decrypt']
    );
    
    // Decrypt the data
    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-CBC', iv },
      cryptoKey,
      encryptedData
    );
    
    // Remove PKCS7 padding
    const unpaddedData = removePKCS7Padding(new Uint8Array(decryptedData));
    
    // Convert bytes to text
    return new TextDecoder().decode(unpaddedData);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Decryption failed. Check your password or input format.');
  }
}

// PKCS7 padding functions (needed for AES)
function addPKCS7Padding(data) {
  const blockSize = 16; // AES block size is 16 bytes
  const padLength = blockSize - (data.length % blockSize);
  const padding = new Uint8Array(padLength).fill(padLength);
  const paddedData = new Uint8Array(data.length + padLength);
  paddedData.set(data);
  paddedData.set(padding, data.length);
  return paddedData;
}

function removePKCS7Padding(data) {
  const padLength = data[data.length - 1];
  return data.slice(0, data.length - padLength);
}

// File form submission - works with Flask backend
function handleFileFormSubmit(event) {
  event.preventDefault();

  // Validate form
  if (!validateFileForm()) {
    return;
  }

  // Show loading spinner
  fileLoading.style.display = 'flex';

  // Let the form submit normally since we need to download a file
  // The Flask backend will handle the file processing and return a download
  // Create a hidden form and submit it programmatically
  const formData = new FormData();
  formData.append('file', fileInput.files[0]);
  formData.append('password', filePassword.value);
  formData.append('mode', document.querySelector('input[name="mode"]:checked').value);

  // Use fetch API to handle the form submission
  const csrfToken = document.querySelector('input[name="csrf_token"]').value;
  formData.append('csrf_token', csrfToken); 
  
  fetch('/process_file', {
    method: 'POST',
    body: formData
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    // Get the filename from the Content-Disposition header if available
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'processed_file';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1];
      }
    }

    return response.blob().then(blob => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);

      // Show success message
      const mode = document.querySelector('input[name="mode"]:checked').value;
      const resultBox = document.createElement('div');
      resultBox.className = 'result-box';
      resultBox.setAttribute('aria-live', 'polite');
      resultBox.innerHTML = `
        <div class="result-header">
          <h3><i class="fas fa-check-circle" aria-hidden="true"></i> Operation Complete</h3>
        </div>
        <textarea readonly aria-label="Operation result">File ${mode === 'encrypt' ? 'encrypted' : 'decrypted'} successfully. The download should start automatically.</textarea>
      `;

      // Add after the file form card
      const existingResultBox = fileTab.querySelector('.result-box');
      if (existingResultBox) {
        fileTab.removeChild(existingResultBox);
      }
      fileTab.appendChild(resultBox);

      // Reset form
      fileForm.reset();
      fileName.style.display = 'none';

      // Hide loading spinner
      fileLoading.style.display = 'none';
    });
  })
  .catch(error => {
    console.error('Error:', error);
    fileLoading.style.display = 'none';
    fileError.textContent = `Error: ${error.message}. Please try again.`;
    fileError.classList.add('visible');
  });
}

// Text form submission with AES encryption
async function handleTextFormSubmit(event) {
  event.preventDefault();

  // Validate form
  if (!validateTextForm()) {
    return;
  }

  try {
    const mode = document.querySelector('input[name="text-mode"]:checked').value;
    const textValue = textInput.value;
    const password = textPassword.value;
    let processedText = '';

    if (mode === 'encrypt') {
      // Use AES encryption
      processedText = await aesEncrypt(textValue, password);
    } else {
      // Use AES decryption
      processedText = await aesDecrypt(textValue, password);
    }

    // Create result box
    const resultBox = document.createElement('div');
    resultBox.className = 'result-box';
    resultBox.setAttribute('aria-live', 'polite');
    resultBox.innerHTML = `
      <div class="result-header">
        <h3><i class="fas fa-check-circle" aria-hidden="true"></i> Operation Complete</h3>
        <button class="btn-copy" title="Copy to clipboard" aria-label="Copy result to clipboard">
          <i class="fas fa-copy" aria-hidden="true"></i> Copy
        </button>
      </div>
      <textarea readonly aria-label="Operation result">${processedText}</textarea>
    `;

    // Replace any existing result box
    const existingResultBox = textTab.querySelector('.result-box');
    if (existingResultBox) {
      textTab.removeChild(existingResultBox);
    }
    textTab.appendChild(resultBox);

    // Add event listener to copy button
    const newCopyBtn = resultBox.querySelector('.btn-copy');
    newCopyBtn.addEventListener('click', copyToClipboard);

    // Reset form
    textForm.reset();
  } catch (error) {
    console.error('Error:', error);
    textError.textContent = error.message;
    textError.classList.add('visible');
  }
}

// Copy to clipboard functionality
function copyToClipboard(event) {
  const btn = event.currentTarget;
  const textarea = btn.closest('.result-box').querySelector('textarea');

  // Select the text
  textarea.select();

  // Copy the text
  try {
    navigator.clipboard.writeText(textarea.value);

    // Visual confirmation
    btn.classList.add('copied');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i> Copied!';

    // Reset button after 2 seconds
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.classList.remove('copied');
    }, 2000);
  } catch (err) {
    console.error('Failed to copy text: ', err);

    // Fallback for browsers that don't support clipboard API
    document.execCommand('copy');

    // Visual confirmation
    btn.classList.add('copied');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i> Copied!';

    // Reset button after 2 seconds
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.classList.remove('copied');
    }, 2000);
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Initialize dark mode from localStorage
  if (localStorage.getItem('dark-mode') === 'true') {
    document.body.classList.add('dark-mode');
    themeToggle.checked = true;
  }

  // Tab switching
  fileTabBtn.addEventListener('click', () => switchTab('file'));
  textTabBtn.addEventListener('click', () => switchTab('text'));

  // Theme toggle
  themeToggle.addEventListener('change', toggleTheme);

  // Password visibility toggle
  passwordToggles.forEach(toggle => {
    toggle.addEventListener('click', togglePasswordVisibility);
  });

  // Password strength checking
  filePassword.addEventListener('input', () => {
    const strengthContainer = document.getElementById('password-strength-file');
    updatePasswordStrength(filePassword.value, strengthContainer);
  });

  textPassword.addEventListener('input', () => {
    const strengthContainer = document.getElementById('password-strength-text');
    updatePasswordStrength(textPassword.value, strengthContainer);
  });

  // File upload handling
  fileInput.addEventListener('change', handleFileSelect);

  // Drag and drop handling
  fileDropArea.addEventListener('dragover', handleDragOver);
  fileDropArea.addEventListener('dragleave', handleDragLeave);
  fileDropArea.addEventListener('drop', handleDrop);

  // Form submission
  fileForm.addEventListener('submit', handleFileFormSubmit);
  textForm.addEventListener('submit', handleTextFormSubmit);

  // Input validation
  textInput.addEventListener('input', () => {
    if (textInput.value.trim()) {
      textError.classList.remove('visible');
    }
  });

  // Copy button (if it exists on page load)
  if (copyBtn) {
    copyBtn.addEventListener('click', copyToClipboard);
  }
});

