const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const clearButton = document.getElementById('clearButton');
const chatlogs = document.getElementById('chatlogs');

const STORAGE_KEY = 'chatHistory';

// Configure marked for markdown rendering
marked.setOptions({
    breaks: true,
    gfm: true
});

// Configure highlight.js for code blocks
marked.setOptions({
    highlight: function(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(code, { language: lang }).value;
        }
        return hljs.highlightAuto(code).value;
    }
});

// Initialize mermaid
mermaid.initialize({ startOnLoad: true, theme: 'dark' });

// Load chat history on page load
document.addEventListener('DOMContentLoaded', loadChatHistory);

// Send message on button click or Enter key
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Clear history button
clearButton.addEventListener('click', clearChatHistory);

function loadChatHistory() {
    const savedMessages = localStorage.getItem(STORAGE_KEY);
    if (savedMessages) {
        const messages = JSON.parse(savedMessages);
        messages.forEach(msg => {
            displayMessage(msg.text, msg.sender, false);
        });
        chatlogs.scrollTop = chatlogs.scrollHeight;
    }
}

function saveChatHistory(message, sender) {
    const savedMessages = localStorage.getItem(STORAGE_KEY);
    const messages = savedMessages ? JSON.parse(savedMessages) : [];
    messages.push({ text: message, sender: sender });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
}

function clearChatHistory() {
    if (confirm('Are you sure you want to clear chat history?')) {
        localStorage.removeItem(STORAGE_KEY);
        chatlogs.innerHTML = '';
    }
}

async function sendMessage() {
    const message = messageInput.value.trim();
    
    if (!message) return;

    // Add user message to chat
    addMessageToChat(message, 'user');
    messageInput.value = '';
    messageInput.focus();

    // Show loading indicator
    const loadingElement = document.createElement('div');
    loadingElement.className = 'message bot loading';
    loadingElement.textContent = 'Bot is thinking...';
    chatlogs.appendChild(loadingElement);
    chatlogs.scrollTop = chatlogs.scrollHeight;

    try {
        // Get chat history to send as context
        const savedMessages = localStorage.getItem(STORAGE_KEY);
        const chatHistory = savedMessages ? JSON.parse(savedMessages) : [];

        // Send message with full chat history to backend
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                message,
                chatHistory
            })
        });

        if (response.status === 403) {
            addMessageToChat("You've reached the limit for this chat session. Start a new chat, or sign in (for free) to increase the limit! ", 'warning');
        }
        if (response.status !== 200) {
            const error = await response.json();
            addMessageToChat(`Error: ${error.error}`, 'error');
            loadingElement.remove();
            return;
        }

        const data = await response.json();
        const replyText = extractReplyText(data);
        
        // Remove loading indicator and add bot response
        loadingElement.remove();
        addMessageToChat(replyText || 'No response from AI.', 'bot');

    } catch (error) {
        console.error('Error:', error);
        addMessageToChat(`Error: ${error.message || 'Unable to process the response'}`, 'error');
        loadingElement.remove();
    }
}

function addMessageToChat(message, sender) {
    displayMessage(message, sender, true);
}

function displayMessage(message, sender, shouldSave = true) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${sender}`;
    
    if (sender === 'user') {
        // User messages are plain text
        messageElement.textContent = message;
    } else if (sender === 'bot') {
        // Bot messages get markdown + formatting
        messageElement.innerHTML = renderMessage(message);
    } else if (sender === 'warning') {
        // Warning messages are plain text
        messageElement.textContent = message;
    } else {
        // Error messages are plain text
        messageElement.textContent = message;
    }

    chatlogs.appendChild(messageElement);
    
    // Save to localStorage if it's a user or bot message
    if (shouldSave && (sender === 'user' || sender === 'bot')) {
        saveChatHistory(message, sender);
    }
    
    // Auto-scroll to bottom
    chatlogs.scrollTop = chatlogs.scrollHeight;
}

function extractReplyText(payload) {
    if (typeof payload === 'string') return payload;

    if (payload?.message) {
        if (typeof payload.message === 'string') return payload.message;
        if (Array.isArray(payload.message)) {
            return payload.message.map(part => typeof part === 'string' ? part : part?.text || '').join('');
        }
        if (typeof payload.message === 'object') {
            return payload.message.content || payload.message.text || '';
        }
    }

    if (payload?.reply && typeof payload.reply === 'string') return payload.reply;
    if (payload?.choices?.[0]?.message?.content) {
        if (typeof payload.choices[0].message.content === 'string') {
            return payload.choices[0].message.content;
        }
        if (Array.isArray(payload.choices[0].message.content)) {
            return payload.choices[0].message.content.map(part => typeof part === 'string' ? part : part?.text || '').join('');
        }
    }
    if (payload?.choices?.[0]?.text) return payload.choices[0].text;

    return '';
}

function renderMessage(text) {
    const content = typeof text === 'string' ? text : '';
    if (!content.trim()) {
        return '<em>No response content.</em>';
    }

    let html = '';
    try {
        html = marked.parse(content);
    } catch (error) {
        console.error('Marked render error:', error);
        html = `<pre>${escapeHtml(content)}</pre>`;
    }
    
    // Then render KaTeX math
    html = renderKatex(html);
    
    // Then render mermaid diagrams
    html = renderMermaid(html);
    
    return html;
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderKatex(html) {
    // Handle inline math: $...$
    html = html.replace(/\$([^\$\n]+?)\$/g, (match, math) => {
        try {
            return katex.renderToString(math, { throwOnError: false, displayMode: false });
        } catch (e) {
            console.error('KaTeX error:', e);
            return match;
        }
    });
    
    // Handle display math: $$...$$
    html = html.replace(/\$\$([^\$]+?)\$\$/gs, (match, math) => {
        try {
            return katex.renderToString(math, { throwOnError: false, displayMode: true });
        } catch (e) {
            console.error('KaTeX error:', e);
            return match;
        }
    });
    
    return html;
}

function renderMermaid(html) {
    // Create a temporary container to parse the HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // Find all pre > code blocks with mermaid language
    temp.querySelectorAll('pre > code.language-mermaid').forEach(codeBlock => {
        const preBlock = codeBlock.parentElement;
        const mermaidDiv = document.createElement('div');
        mermaidDiv.className = 'mermaid';
        mermaidDiv.textContent = codeBlock.textContent;
        preBlock.replaceWith(mermaidDiv);
    });
    
    html = temp.innerHTML;
    
    // Reinitialize mermaid to render new diagrams
    setTimeout(() => {
        mermaid.contentLoaded();
    }, 0);
    
    return html;
}
