const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

// Configurar marked para que no parsee de forma peligrosa si hay HTML (opcional pero buena práctica)
marked.setOptions({
    breaks: true,
    gfm: true
});

// --- HISTORIAL ---
let chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];

function saveHistory() {
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
}

function renderHistory() {
    chatBox.innerHTML = '';
    if (chatHistory.length === 0) {
        addMessage("¡Hola! Soy el asistente de Contabilidad y Finanzas creado por **Diego Martín Cruz Vázquez**. Hazme una pregunta sobre tu material de estudio.", false, false);
    } else {
        chatHistory.forEach(msg => {
            addMessage(msg.content, msg.isUser, false);
        });
    }
}

function addMessage(content, isUser = false, save = true) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', isUser ? 'user-message' : 'bot-message');
    
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    
    if (isUser) {
        contentDiv.textContent = content;
        msgDiv.appendChild(contentDiv);
    } else {
        contentDiv.innerHTML = marked.parse(content);
        msgDiv.appendChild(contentDiv);
        
        // Agregar botón de copiar para respuestas del bot
        const copyBtn = document.createElement('button');
        copyBtn.classList.add('copy-btn');
        copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copiar';
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(content);
            copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Copiado!';
            setTimeout(() => {
                copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copiar';
            }, 2000);
        };
        msgDiv.appendChild(copyBtn);
    }
    
    chatBox.appendChild(msgDiv);
    scrollToBottom();
    
    if (save) {
        chatHistory.push({ content, isUser });
        saveHistory();
    }
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

// Enfocar el input y cargar historial cuando cargue la página
window.addEventListener('load', () => {
    renderHistory();
    userInput.focus();
});

// Botón de Limpiar Chat
document.getElementById('clear-btn').addEventListener('click', () => {
    if (confirm('¿Estás seguro de que quieres borrar todo el historial?')) {
        chatHistory = [];
        saveHistory();
        renderHistory();
    }
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
