import express from 'express';
import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT_DIR } from '../services/paths.js'

const router = express.Router();

router.get('/', (req, res) => {
    res.json({ message: 'Welcome to the API 🚀' });
});

router.get('/status', (req, res) => {
    res.json({ uptime: process.uptime(), status: 'OK', time: new Date() });
});

// ------------- CHAT ENDPOINT -------------
// POST /api/chat - Send message to OpenRouter

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let systemPrompt;
const DATE = new Date().toLocaleString();
const EXPRESSIONS = '(idle) (smirk) (blink)'
const MOTIONS = '';
const promptConfigFileLocation = path.join(ROOT_DIR, 'config', 'promptPaths.json');

console.log(':: Reading configuration file(s)...');

if (!fs.existsSync(promptConfigFileLocation))
    console.warn('Cannot find system prompt paths. The system prompt will be empty.')
else {
    let contents = fs.readFileSync(promptConfigFileLocation, 'utf-8');
    let lines = countNewlines(contents);

    console.log(`Parsing prompt configuration, ${lines} lines...`);

    let promptConfigPaths;
    let defaultPromptPath;
    try {
        promptConfigPaths = JSON.parse(contents);
        defaultPromptPath = path.join(ROOT_DIR, promptConfigPaths.default);
    } catch (err) {
        console.warn(`The prompt configuration file isn't valid :(`);
        console.warn('The system prompt will be empty.');
    }
    if (!fs.existsSync(defaultPromptPath)) {
        console.warn('Cannot find system prompt paths. The system prompt will be empty.');
    } else {
        console.log(':: Reading default system prompt...')

        let contents = fs.readFileSync(defaultPromptPath, 'utf-8')
        let lines = countNewlines(contents);

        console.log(`Default system prompt: ${lines} lines.`)
        if (!process.env.NOWARN_CONFIG) {
            console.warn(`Warning: Make sure you trust the file contents. If you have just cloned the repo from the official source (Ihavenochoised/NodeJS-AI-Chat-Wrapper), you may ignore this warning. The file contents of ${defaultPromptPath} will be evaluated directly. \nContinuing execution in 5 seconds. \nYou may disable this warning by adding "NOWARN_CONFIG=anyvalue" to the environment.`);
            await sleep(5);
        }
        console.log('Parsing system prompt...')

        // Ehh what should I do with this eval lol, its bad practice but its not user code :/
        systemPrompt = eval('`' + contents + '`');
    }
}

router.post('/chat', async (req, res) => {
    try {
        const { message, chatHistory } = req.body;
        const freeMessageLimit = 5;
        const loggedIn = req.session.loggedIn || false;

        const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'qwen/qwen3-next-80b-a3b-instruct:free';
        process.env.OPENROUTER_MODEL ? console.log(`Using ${OPENROUTER_MODEL}`) : console.log(`Using default model: ${OPENROUTER_MODEL}`);

        const OPENROUTER_FALLBACKS = process.env.OPENROUTER_FALLBACKS || 'openrouter/free';
        const fallbacks = JSON.parse(OPENROUTER_FALLBACKS);

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
        const messages = [];
        if (systemPrompt)
            messages.push({
                role: 'system',
                content: systemPrompt
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
            model: OPENROUTER_MODEL,
            models: fallbacks,
            messages: messages,
            temperature: 0.85,
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

// -------------- HELPERS ------------------

function countNewlines(input) {
    // Match \n globally. Use an empty fallback array if no match is found.
    const matches = input.match(/\n/g);
    return matches ? matches.length : 0;
};

async function sleep(seconds) {
    return new Promise ((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, seconds * 1000);
    })
};

// -----------------------------------------

export default router;
