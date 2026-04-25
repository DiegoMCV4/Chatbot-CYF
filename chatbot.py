import os
import gradio as gr
import nltk
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None

def download_nltk_data():
    try:
        nltk.data.find('tokenizers/punkt')
    except LookupError:
        nltk.download('punkt', quiet=True)

    try:
        nltk.data.find('tokenizers/punkt_tab')
    except LookupError:
        nltk.download('punkt_tab', quiet=True)

def extract_text_from_pdf(pdf_path):
    text = ""
    if fitz:
        doc = fitz.open(pdf_path)
        for page in doc:
            text += page.get_text() + "\n"
    elif PdfReader:
        reader = PdfReader(pdf_path)
        for page in reader.pages:
            if page.extract_text():
                text += page.extract_text() + "\n"
    else:
        print("Error: No se encontró PyMuPDF o pypdf. Instálalos con 'pip install PyMuPDF pypdf'")
        return ""
    return text

def preprocess_text(text):
    import re
    # Limpiar espacios extra
    text = re.sub(r' +', ' ', text)
    
    # Agrupamos por bloques lógicos (párrafos)
    raw_lines = text.split('\n')
    chunks = []
    current_chunk = ""
    
    for line in raw_lines:
        line = line.strip()
        if not line:
            if len(current_chunk) > 30:
                chunks.append(current_chunk.strip())
            current_chunk = ""
            continue
            
        current_chunk += " " + line
        
        # Cortar en puntos o dos puntos si el bloque ya tiene suficiente texto
        if len(current_chunk) > 200 and (line.endswith('.') or line.endswith(':')):
            chunks.append(current_chunk.strip())
            current_chunk = ""
            
    if current_chunk.strip():
        chunks.append(current_chunk.strip())
        
    return chunks

def get_answer(user_query, text_chunks, tfidf_vectorizer, tfidf_matrix):
    # --- Lógica Conversacional Básica ---
    query_lower = user_query.lower().strip()
    saludos = ["hola", "buenas", "buenos dias", "buenos días", "buenas tardes", "buenas noches", "qué tal", "que tal", "saludos"]
    despedidas = ["adiós", "adios", "chau", "hasta luego", "nos vemos", "bye"]
    agradecimientos = ["gracias", "muchas gracias", "te lo agradezco", "excelente"]
    identidad = ["quién eres", "quien eres", "qué eres", "que eres", "cómo te llamas", "como te llamas", "creador", "quien te creo"]

    if any(saludo in query_lower for saludo in saludos) and len(query_lower.split()) <= 4:
        return "¡Hola! Qué gusto saludarte. Soy el asistente de Contabilidad y Finanzas de Diego Martín. ¿En qué te puedo ayudar hoy con tu material de estudio?"
        
    if any(despedida in query_lower for despedida in despedidas) and len(query_lower.split()) <= 3:
        return "¡Hasta luego! Éxito en tus estudios de Contabilidad."
        
    if any(agradecimiento in query_lower for agradecimiento in agradecimientos) and len(query_lower.split()) <= 4:
        return "¡De nada! Estoy aquí para ayudarte a entender mejor la materia. ¿Tienes alguna otra duda?"
        
    if any(ident in query_lower for ident in identidad):
        return "Soy un asistente virtual creado por **Diego Martín Cruz Vázquez**, diseñado especialmente para responder preguntas sobre los postulados y bases de la Contabilidad y Finanzas."

    # Stop words basicas de español en código duro para mejorar la búsqueda
    stop_words = ["que", "los", "las", "por", "para", "con", "del", "una", "unos", "unas", "como"]
    search_query = user_query
    for w in stop_words:
        search_query = search_query.replace(f" {w} ", " ")
        
    query_vec = tfidf_vectorizer.transform([search_query])
    similarities = cosine_similarity(query_vec, tfidf_matrix).flatten()
    
    # Obtener los 3 mejores resultados
    best_indices = similarities.argsort()[-3:][::-1]
    
    # Bajamos el umbral para ser más permisivos y añadimos respuesta genérica amigable
    if similarities[best_indices[0]] < 0.015:
        return "Esa es una pregunta muy interesante 🤔, pero mi conocimiento está enfocado únicamente en **Contabilidad y Finanzas** (basado en el material de estudio). Intenta preguntarme algo sobre esos temas o usa palabras clave más específicas."
        
    response = "📖 **Basado en el documento, encontré lo siguiente:**\n\n"
    added_chunks = set()
    for idx in best_indices:
        # Mostramos los resultados que tengan un mínimo de similitud
        if similarities[idx] >= 0.015:
            chunk = text_chunks[idx]
            if chunk not in added_chunks: # Evitamos cosas duplicadas
                response += f"🔹 {chunk}\n\n"
                added_chunks.add(chunk)
            
    return response.strip()

# Variables globales para conservar estado
chunks = []
vectorizer = None
tfidf_matrix = None

def init_model():
    global chunks, vectorizer, tfidf_matrix
    pdf_file = "S3Aa-CruzVázquezDiegoMartín.pdf"
    if not os.path.exists(pdf_file):
        print(f"Error: No se encontró el archivo '{pdf_file}' en este directorio.")
        return False
    
    print(f"Leyendo '{pdf_file}'...")
    text = extract_text_from_pdf(pdf_file)
    if not text:
        return False
        
    print("Procesando información y entrenando modelo TF-IDF...")
    chunks = preprocess_text(text)
    vectorizer = TfidfVectorizer()
    tfidf_matrix = vectorizer.fit_transform(chunks)
    return True

def chat_fn(message, history):
    global chunks, vectorizer, tfidf_matrix
    if not chunks:
        return "El modelo no se ha inicializado correctamente. Revisa que el PDF exista."
    return get_answer(message, chunks, vectorizer, tfidf_matrix)

def main():
    print("Inicializando base de conocimiento...")
    if not init_model():
        return
        
    print("Iniciando interfaz web con Gradio...")
    # Crear interfaz de Gradio
    demo = gr.ChatInterface(
        fn=chat_fn,
        title="🤖 ChatBot de Contabilidad y Finanzas",
        description="""Hazme una pregunta basada en el PDF de tu asignación.
        Por ejemplo: '¿A qué se refiere el postulado de entidad económica?' o '¿Cuáles son los usuarios internos?'"""
    )
    
    # El servidor se iniciará y abrirá una pestaña en el navegador automáticamente
    demo.launch(inbrowser=True)

if __name__ == "__main__":
    main()
