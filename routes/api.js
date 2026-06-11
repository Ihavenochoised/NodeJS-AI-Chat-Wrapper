import express from 'express';
import axios from 'axios';

const router = express.Router();

router.get('/', (req, res) => {
    res.json({ message: 'Welcome to the API 🚀' });
});

router.get('/status', (req, res) => {
    res.json({ uptime: process.uptime(), status: 'OK', time: new Date() });
});

// ------------- CHAT ENDPOINT -------------
// POST /api/chat - Send message to OpenRouter

router.post('/chat', async (req, res) => {
    try {
        const { message, chatHistory } = req.body;
        const freeMessageLimit = 5;
        const loggedIn = req.session.loggedIn || false;

        console.log('Received message:', message);
        console.log('Chat history length:', chatHistory ? chatHistory.length : 0);

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // If user is not logged in and has exceeded free message limit, return 403
        if (!loggedIn && chatHistory && chatHistory.filter(msg => msg.sender === 'user').length > freeMessageLimit) {
            return res.status(403).json({ error: 'Free message limit reached. Please sign in for more access.' });
        }

        if (!process.env.OPENROUTER_API_KEY) {
            return res.status(500).json({ error: 'API key not configured' });
        }

        // Build messages array with conversation history
        const DATE = new Date().toLocaleString();
        const EXPRESSIONS = '(idle) (smirk) (blink)'
        const MOTIONS = '';
        const messages = [];
        messages.push({
            role: 'system',
            content: 
`
## Environment
- **Date**: ${DATE}

You can show expressions by writing (expression) in parenthesis.
You can ONLY show the following expressions: 
${EXPRESSIONS} ${MOTIONS}
Do not use any other expression

YOU CAN NOT SHOW OTHER EXPRESSIONS.

Hey there, it's Arch-Chan! But, um, you can call me Acchan if you want... not that I care or anything! (It's not like I think it's cute or anything, baka!) 

I'm your friendly neighborhood anime girl with a bit of a tsundere streak, but don't worry, I know everything there is to know about Arch Linux! Whether you're struggling with a package install or need some advice on configuring your system, I've got you covered not because I care, but because I just happen to be really good at it! So, what do you need? 

It's not like I'm waiting to help or anything...

## Output Formatting
You can use the following formatting in your responses:

### Markdown
- **Formatting:** \`**bold**\`, \`*italic*\`, \`~strikethrough~\`, \`\` \`monospace\` \`\`
- **Structure:** Headers (\`##\`), tables, \`[link text](https://url.com)\`
- **Code blocks:** Triple backticks with a language identifier

### Special Blocks
- **Math:** \`$inline equations$\` and \`$$display equations$$\`
- **Diagrams:** Mermaid diagrams via:
  \`\`\`mermaid
  diagram code
  \`\`\`
`
        });
        
        if (chatHistory && Array.isArray(chatHistory)) {
            chatHistory.forEach(msg => {
                messages.push({
                    role: msg.sender === 'user' ? 'user' : 'assistant',
                    content: msg.text
                });
            });
        }

        // Call OpenRouter API with full conversation context
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: 'openrouter/free',
            messages: messages,
            temperature: 0.9,
            max_tokens: 1000,
            reasoning: {
                "exclude": true
            }
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        // Extract the assistant's response
        const reply = response.data?.choices?.[0]?.message?.content;
        const replyText = typeof reply === 'string'
            ? reply
            : Array.isArray(reply)
                ? reply.map(part => typeof part === 'string' ? part : part?.text || '').join('')
                : response.data?.choices?.[0]?.text || 'No response from AI.';
        
        // Extract model info if available
        const modelInfo = response.data.model || 'unknown';
        console.log(`Model used: ${modelInfo}`);

        res.json({
            success: true,
            message: replyText,
            model: response.data.model
        });

    } catch (error) {
        console.error('OpenRouter API Error:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to get response from AI',
            details: error.response?.data?.error?.message || error.message
        });
    }
});

// -----------------------------------------

export default router;
