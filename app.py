from flask import Flask, request, jsonify, send_from_directory
import chatbot
import os

app = Flask(__name__, static_folder='static')

# Initialize the chatbot model when the server starts
print("Inicializando el modelo del chatbot...")
success = chatbot.init_model()
if not success:
    print("Advertencia: El modelo no se inicializó correctamente. Comprueba que el PDF exista.")

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    if not data or 'message' not in data:
        return jsonify({'error': 'No se proporcionó ningún mensaje'}), 400
        
    user_message = data['message']
    
    # Get response from existing chatbot logic
    response = chatbot.chat_fn(user_message, [])
    
    return jsonify({'response': response})

if __name__ == '__main__':
    print("Iniciando servidor Flask en http://127.0.0.1:5000")
    app.run(debug=True, port=5000)
