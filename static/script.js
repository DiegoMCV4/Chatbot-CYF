const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

// Configurar marked para que no parsee de forma peligrosa si hay HTML (opcional pero buena práctica)
marked.setOptions({
    breaks: true,
    gfm: true
});

function addMessage(content, isUser = false) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', isUser ? 'user-message' : 'bot-message');
    
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    
    if (isUser) {
        contentDiv.textContent = content;
    } else {
        // Usar marked para convertir el Markdown en HTML
        contentDiv.innerHTML = marked.parse(content);
    }
    
    msgDiv.appendChild(contentDiv);
    chatBox.appendChild(msgDiv);
    scrollToBottom();
}

function showTyping() {
    const indicator = document.createElement('div');
    indicator.classList.add('typing-indicator');
    indicator.id = 'typing';
    
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.classList.add('dot');
        indicator.appendChild(dot);
    }
    
    chatBox.appendChild(indicator);
    scrollToBottom();
}

function removeTyping() {
    const indicator = document.getElementById('typing');
    if (indicator) {
        indicator.remove();
    }
}

function scrollToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function handleSend() {
    const text = userInput.value.trim();
    if (!text) return;
    
    // Añadir mensaje del usuario a la pantalla
    addMessage(text, true);
    userInput.value = '';
    
    // Mostrar indicador de "escribiendo"
    showTyping();
    
    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });
        
        const data = await response.json();
        removeTyping();
        
        if (data.response) {
            addMessage(data.response);
        } else if (data.error) {
            addMessage("Error: " + data.error);
        }
    } catch (error) {
        removeTyping();
        addMessage("Lo siento, hubo un error al conectar con el servidor.");
        console.error("Error fetching chat:", error);
    }
}

sendBtn.addEventListener('click', handleSend);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
});

// Enfocar el input automáticamente cuando cargue la página
window.addEventListener('load', () => {
    userInput.focus();
});

// Lógica para los botones de sugerencia
const suggestionBtns = document.querySelectorAll('.suggestion-btn');
suggestionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Al hacer clic, poner el texto exacto de la pregunta en el input y enviarlo
        let question = "";
        if (btn.innerText.includes('entidad económica')) {
            question = "¿A qué se refiere el postulado de entidad económica?";
        } else if (btn.innerText.includes('usuarios internos')) {
            question = "¿Cuáles son los usuarios internos?";
        } else if (btn.innerText.includes('contabilidad financiera')) {
            question = "¿Qué es la contabilidad financiera?";
        } else {
            question = btn.innerText;
        }
        
        userInput.value = question;
        handleSend();
    });
});
