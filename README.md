
# SecureFileLocker

SecureFileLocker is a simple, web-based file and text encryption tool built with Flask and AES encryption.

It allows users to:
- Upload any file and securely encrypt/decrypt it with a password
- Type or paste any text and encrypt/decrypt it securely
- All encryption is done using **AES-CBC with a random IV**
- Includes dark mode, copy-to-clipboard, and a smooth UI

---

## 🔐 Features

- AES encryption for both files and text (secure & reliable)
- Works with any file type: PDF, DOCX, JPG, ZIP, etc.
- Automatically deletes temporary files after processing
- No data is stored — 100% session-based
- Built-in copy-to-clipboard for encrypted results
- Mobile friendly + dark mode UI

---

## 🛠 Tech Stack

- Python + Flask
- Jinja2 templating
- JavaScript for UI interactions
- HTML5 & CSS3
- Hosted on [Render](https://render.com)

---

## 🚀 Run Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/eagle4b1/SecureFileLocker.git
   cd SecureFileLocker
   ```

2. Create a virtual environment:
   ```bash
   python3 -m venv myenv
   source myenv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run the app:
   ```bash
   flask run
   ```

---

## 🌐 Live Demo

Access the app here: [https://securefilelocker.onrender.com](https://securefilelocker.onrender.com)

---

## 📷 Screenshots

_Add screenshots here if you'd like — drag into the README on GitHub or use Markdown image tags._

---

## 📄 License

MIT License — use it freely and credit if you share.

---

Made with love by [@eagle4b1](https://github.com/eagle4b1)
