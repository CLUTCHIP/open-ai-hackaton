from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'message': 'Simple backend is working!'})

@app.route('/', methods=['GET'])
def home():
    return jsonify({'message': 'Backend is running on port 5000'})

if __name__ == '__main__':
    print("🧪 Simple Test Backend Starting...")
    print("🌐 Running on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
