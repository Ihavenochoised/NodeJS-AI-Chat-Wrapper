import 'dotenv/config';
import fs from 'fs';

const DATE = new Date().toLocaleString();
const EXPRESSIONS = '(idle) (smirk) (blink)'
const MOTIONS = '';
const systemPrompt = eval('`' + fs.readFileSync(
    './config/prompts/tsundere.txt',
    'utf8'
) + '`');

const MODELS = [
    'nvidia/nemotron-3-ultra-550b-a55b:free',
    'poolside/laguna-m.1:free',
    'nex-agi/nex-n2-pro:free',
    'nvidia/nemotron-3-super-120b-a12b:free',
    'openai/gpt-oss-120b:free',
    'poolside/laguna-xs.2:free',
    'openai/gpt-oss-20b:free',
    'google/gemma-4-31b-it:free',
    'nvidia/nemotron-3-nano-30b-a3b:free',
    'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
    'nvidia/nemotron-nano-12b-v2-vl:free',
    'nvidia/nemotron-nano-9b-v2:free',
    'google/gemma-4-26b-a4b-it:free',
    'nvidia/llama-nemotron-embed-vl-1b-v2:free',
    'liquid/lfm-2.5-1.2b-thinking:free',
    'nvidia/nemotron-3.5-content-safety:free',
    'liquid/lfm-2.5-1.2b-instruct:free',
    'qwen/qwen3-next-80b-a3b-instruct:free',
    'nvidia/llama-nemotron-rerank-vl-1b-v2:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
    'meta-llama/llama-3.2-3b-instruct:free',
    'nousresearch/hermes-3-llama-3.1-405b:free',
    'qwen/qwen3-coder:free'
];

for (const model of MODELS) {
    console.log(`\n=== ${model} ===`);

    try {
        const response = await fetch(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                signal: AbortSignal.timeout(60_000),
                body: JSON.stringify({
                    model,
                    messages: [
                        {
                            role: 'system',
                            content: systemPrompt
                        },
                        {
                            role: 'user',
                            content: 'hi'
                        }
                    ]
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error(
                `ERROR ${response.status}:`,
                data.error?.message ?? data
            );
            continue;
        }

        console.log(
            data.choices?.[0]?.message?.content ??
            '[No content returned]'
        );
    } catch (error) {
        console.error(
            error.name === 'TimeoutError'
                ? 'TIMEOUT (60s)'
                : error
        );
    }
}