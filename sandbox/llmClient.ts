/**
 * Groq LLM Client - AI reasoning for patch generation and analysis
 * 
 * This module integrates with Groq (sponsor requirement) for all
 * LLM-based reasoning in the debugging agent.
 */

interface GroqChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GroqChatRequest {
  model: string;
  messages: GroqChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
}

interface GroqChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Call Groq Chat API with a prompt
 * 
 * @param prompt - The user prompt to send to Groq
 * @param systemPrompt - Optional system prompt to set context
 * @returns The LLM's response text
 */
export async function callGroqChat(
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('GROQ_API_KEY environment variable is not set');
  }

  try {
    const messages: GroqChatMessage[] = [];

    // Add system prompt if provided
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    // Add user prompt
    messages.push({
      role: 'user',
      content: prompt,
    });

    const requestBody: GroqChatRequest = {
      model: 'llama-3.3-70b-versatile', // Groq's latest fast, capable model
      messages,
      temperature: 0.1, // Low temperature for consistent, focused responses
      max_tokens: 4096,
      top_p: 1,
      stream: false,
    };

    console.log(`[Groq] Sending request with ${messages.length} messages`);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const data: GroqChatResponse = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from Groq API');
    }

    const content = data.choices[0].message.content;

    console.log(`[Groq] Response received (${data.usage.total_tokens} tokens)`);

    return content;
  } catch (error) {
    console.error('[Groq] API call failed:', error);
    throw error;
  }
}

/**
 * Generate a code patch using Groq
 * 
 * @param bugDescription - Description of the bug
 * @param relevantFiles - Array of file paths and their contents
 * @param exaPatterns - Patterns from Exa search
 * @returns Generated patch instructions
 */
export async function generatePatchWithGroq(
  bugDescription: string,
  relevantFiles: Array<{ path: string; content: string }>,
  exaPatterns: string[]
): Promise<string> {
  const systemPrompt = `You are an expert debugging assistant. Your task is to analyze bugs and generate precise code fixes.

Rules:
1. Provide ONLY the fixed code for each file
2. Format your response as: FILE: path/to/file.ext followed by a code block
3. Include the complete fixed file content, not just the changes
4. Be conservative - only fix what's necessary
5. Maintain the original code style and formatting
6. Add comments explaining the fix`;

  const userPrompt = `Fix the following bug:

BUG DESCRIPTION:
${bugDescription}

RELEVANT FILES:
${relevantFiles
  .map(
    (f) => `
File: ${f.path}
\`\`\`
${f.content}
\`\`\`
`
  )
  .join('\n')}

SIMILAR BUG PATTERNS (from Exa search):
${exaPatterns.join('\n\n')}

Analyze the bug, apply insights from the similar patterns, and provide the fixed code.`;

  return await callGroqChat(userPrompt, systemPrompt);
}

/**
 * Summarize the root cause of a bug using Groq
 * 
 * @param bugDescription - Description of the bug
 * @param relevantFiles - Array of file paths and their contents
 * @param exaPatterns - Patterns from Exa search
 * @returns Root cause analysis
 */
export async function summarizeRootCause(
  bugDescription: string,
  relevantFiles: Array<{ path: string; content: string }>,
  exaPatterns: string[]
): Promise<string> {
  const systemPrompt = `You are an expert debugging assistant. Analyze bugs and identify their root causes concisely.`;

  const userPrompt = `Analyze this bug and identify the root cause:

BUG DESCRIPTION:
${bugDescription}

RELEVANT FILES:
${relevantFiles
  .map((f) => `File: ${f.path} (${f.content.split('\n').length} lines)`)
  .join('\n')}

SIMILAR PATTERNS:
${exaPatterns.slice(0, 3).join('\n')}

Provide a concise root cause analysis (2-3 sentences).`;

  return await callGroqChat(userPrompt, systemPrompt);
}

/**
 * Explain a code change using Groq
 * 
 * @param diff - The git diff of changes
 * @returns Explanation of the changes
 */
export async function explainChanges(diff: string): Promise<string> {
  const systemPrompt = `You are a code review assistant. Explain code changes clearly and concisely.`;

  const userPrompt = `Explain what this code change does and why it fixes the bug:

\`\`\`diff
${diff}
\`\`\`

Provide a brief explanation (2-3 sentences).`;

  return await callGroqChat(userPrompt, systemPrompt);
}
