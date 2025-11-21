# 🎯 Sponsor Integrations - Exa & Groq

This document explains how PatchPilot integrates with our sponsor services: **Exa** and **Groq**.

## Overview

PatchPilot uses two sponsor services as core components of the debugging workflow:

1. **Exa** - Search for similar bugs and real-world fixes
2. **Groq** - Fast LLM inference for patch generation and reasoning

Both integrations are **fully implemented** and ready to use with API keys.

---

## 🔍 Exa Integration

### Purpose
Exa is used to search for similar bugs and real-world fixes across the web, providing the agent with patterns and solutions that have worked for similar issues.

### Implementation
**File**: `sandbox/exaClient.ts`

**Key Function**:
```typescript
export async function queryExaForSimilarBugs(errorText: string): Promise<string[]>
```

### How It Works

1. **Query Construction**: Extracts error type and keywords from bug description
2. **API Call**: Searches Exa with neural search optimized for GitHub issues
3. **Pattern Extraction**: Formats results into actionable patterns
4. **Fallback**: Returns default patterns if API fails (graceful degradation)

### API Configuration

```typescript
const response = await fetch('https://api.exa.ai/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.EXA_API_KEY,
  },
  body: JSON.stringify({
    query: searchQuery,
    type: 'neural',
    useAutoprompt: true,
    numResults: 5,
    contents: { text: true },
    category: 'github',
  }),
});
```

### Usage in Agent

**Step 3** of the debugging workflow:
```typescript
// Query Exa for similar bugs
const exaPatterns = await queryExaForSimilarBugs(
  sessionId,
  bugDescription,
  backendBaseUrl
);
```

The patterns are then passed to Groq for informed patch generation.

### Setup

1. **Get API Key**: Visit https://exa.ai/ and sign up
2. **Add to Environment**:
   ```bash
   EXA_API_KEY=your_exa_api_key_here
   ```
3. **Test**: The agent will automatically use Exa when the key is set

### Example Output

```
Pattern 1 (from https://github.com/...):
TypeError: Cannot read property 'name' of undefined - Fixed by adding null check
Before accessing object properties, always verify the object exists...

Pattern 2 (from https://stackoverflow.com/...):
Common solution for undefined property access
Add optional chaining (?.) or explicit null checks...
```

---

## 🤖 Groq Integration

### Purpose
Groq provides ultra-fast LLM inference for all AI reasoning tasks in the agent, including:
- Root cause analysis
- Patch generation
- Change explanation

### Implementation
**File**: `sandbox/llmClient.ts`

**Key Functions**:
```typescript
// Core chat function
export async function callGroqChat(
  prompt: string,
  systemPrompt?: string
): Promise<string>

// Specialized functions
export async function generatePatchWithGroq(...)
export async function summarizeRootCause(...)
export async function explainChanges(...)
```

### How It Works

1. **Model Selection**: Uses `llama-3.1-70b-versatile` for fast, capable inference
2. **Temperature**: Set to 0.1 for consistent, focused responses
3. **Context Building**: Combines bug description, file contents, and Exa patterns
4. **Structured Output**: Expects specific format for patch application

### API Configuration

```typescript
const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
  },
  body: JSON.stringify({
    model: 'llama-3.1-70b-versatile',
    messages: [...],
    temperature: 0.1,
    max_tokens: 4096,
  }),
});
```

### Usage in Agent

**Step 4** of the debugging workflow:

```typescript
// 1. Analyze root cause
const rootCause = await summarizeRootCause(
  bugDescription,
  validFiles,
  exaPatterns
);

// 2. Generate patch
const patchResponse = await generatePatchWithGroq(
  bugDescription,
  validFiles,
  exaPatterns
);

// 3. Explain changes
const explanation = await explainChanges(diff);
```

### Prompt Engineering

#### Root Cause Analysis
```typescript
systemPrompt: "You are an expert debugging assistant. 
               Analyze bugs and identify their root causes concisely."

userPrompt: "Analyze this bug and identify the root cause:
             BUG DESCRIPTION: ...
             RELEVANT FILES: ...
             SIMILAR PATTERNS: ...
             Provide a concise root cause analysis (2-3 sentences)."
```

#### Patch Generation
```typescript
systemPrompt: "You are an expert debugging assistant. 
               Your task is to analyze bugs and generate precise code fixes.
               
               Rules:
               1. Provide ONLY the fixed code for each file
               2. Format as: FILE: path/to/file.ext followed by code block
               3. Include complete fixed file content
               4. Be conservative - only fix what's necessary
               5. Maintain original code style
               6. Add comments explaining the fix"

userPrompt: "Fix the following bug:
             BUG DESCRIPTION: ...
             RELEVANT FILES: ...
             SIMILAR BUG PATTERNS (from Exa): ...
             
             Analyze the bug, apply insights from patterns, 
             and provide the fixed code."
```

### Setup

1. **Get API Key**: Visit https://console.groq.com/ and sign up
2. **Add to Environment**:
   ```bash
   GROQ_API_KEY=your_groq_api_key_here
   ```
3. **Test**: The agent will use Groq for all LLM operations

### Example Workflow

```
[Agent] Analyzing root cause with Groq...
[Groq] Root cause: The function attempts to access the 'name' property 
       on a user object that may be null or undefined, causing a TypeError.

[Agent] Generating patch with Groq LLM...
[Groq] Response received (1234 tokens)

[Agent] ✓ Patch generated successfully (2 files modified)
[Agent] Explanation: Added null check before accessing user.name property 
        and implemented optional chaining to prevent undefined errors.
```

---

## 🔄 Integration Flow

Here's how Exa and Groq work together in the debugging workflow:

```
1. Clone Repository
   ↓
2. Narrow Relevant Files
   ↓
3. Query Exa for Similar Bugs
   ├─→ Search: "how to fix TypeError undefined property"
   └─→ Returns: 5 patterns from GitHub/Stack Overflow
   ↓
4. Generate Patch with Groq
   ├─→ Input: Bug description + Files + Exa patterns
   ├─→ Groq analyzes root cause
   ├─→ Groq generates fix using patterns as guidance
   └─→ Groq explains the changes
   ↓
5. Run Tests
   ↓
6. Create PR
```

**Key Insight**: Exa provides the "wisdom of the crowd" (real-world solutions), and Groq applies that wisdom to generate a contextual fix.

---

## 📊 Benefits

### Exa
- ✅ **Real-world solutions**: Learn from actual fixes in production code
- ✅ **Pattern recognition**: Identify common bug patterns
- ✅ **Contextual search**: Neural search understands intent
- ✅ **GitHub-focused**: Optimized for code-related searches

### Groq
- ✅ **Ultra-fast inference**: Responses in seconds, not minutes
- ✅ **Cost-effective**: Competitive pricing for LLM calls
- ✅ **Powerful models**: Llama 3.1 70B for capable reasoning
- ✅ **OpenAI-compatible API**: Easy integration

### Combined
- ✅ **Better patches**: Informed by real-world solutions
- ✅ **Faster debugging**: Quick search + fast inference
- ✅ **Higher success rate**: Patterns improve LLM accuracy
- ✅ **Explainable fixes**: Clear reasoning and explanations

---

## 🧪 Testing the Integrations

### Test Exa

```bash
# Set API key
export EXA_API_KEY=your_key_here

# Run a test session with a common bug
# The logs will show: "Querying Exa for similar bug patterns..."
# Followed by: "✓ Retrieved X similar patterns from Exa"
```

### Test Groq

```bash
# Set API key
export GROQ_API_KEY=your_key_here

# Run a test session
# The logs will show:
# "Analyzing root cause with Groq..."
# "Generating patch with Groq LLM..."
# "Explanation: ..."
```

### Test Both Together

```bash
# Set both keys
export EXA_API_KEY=your_exa_key
export GROQ_API_KEY=your_groq_key

# Create a session with a real bug
# Watch the logs to see:
# 1. Exa search results
# 2. Groq root cause analysis
# 3. Groq patch generation (using Exa patterns)
# 4. Groq change explanation
```

---

## 💡 Best Practices

### Exa
1. **Specific queries**: Better bug descriptions = better search results
2. **Error types**: Include error types (TypeError, AttributeError) for better matching
3. **Fallback handling**: Agent continues even if Exa fails
4. **Result limit**: 5 results balances quality and speed

### Groq
1. **Low temperature**: 0.1 for consistent, deterministic fixes
2. **Structured prompts**: Clear instructions improve output quality
3. **Token limits**: 4096 max tokens handles most files
4. **Error handling**: Graceful failure with informative messages

### Combined
1. **Pattern integration**: Always pass Exa patterns to Groq prompts
2. **Context building**: More context = better fixes
3. **Validation**: Test the fix before creating PR
4. **Logging**: Track both services in session logs

---

## 🔧 Troubleshooting

### Exa Issues

**Problem**: "EXA_API_KEY not set"
- **Solution**: Add key to `.env` file

**Problem**: "Exa API error: 401"
- **Solution**: Verify API key is correct

**Problem**: "Exa search failed"
- **Solution**: Check network connection, verify API quota

**Fallback**: Agent uses default patterns if Exa fails

### Groq Issues

**Problem**: "GROQ_API_KEY environment variable is not set"
- **Solution**: Add key to `.env` file

**Problem**: "Groq API error: 401"
- **Solution**: Verify API key is correct

**Problem**: "No files were modified by the patch"
- **Solution**: Check Groq response format, verify file paths

**No Fallback**: Groq is required for patch generation (will fail gracefully)

---

## 📈 Monitoring

### Exa Metrics
- Search queries per session
- Patterns retrieved
- Fallback usage rate
- Search latency

### Groq Metrics
- API calls per session (typically 3: root cause, patch, explanation)
- Tokens used
- Response latency
- Success rate

### Combined Metrics
- Sessions using both services
- Pattern-to-patch correlation
- Overall fix success rate

---

## 🎓 Learn More

### Exa
- **Website**: https://exa.ai/
- **Docs**: https://docs.exa.ai/
- **Use Cases**: Neural search, knowledge retrieval

### Groq
- **Website**: https://groq.com/
- **Console**: https://console.groq.com/
- **Docs**: https://console.groq.com/docs
- **Models**: Llama 3.1, Mixtral, Gemma

---

## ✅ Integration Checklist

- [x] Exa client implemented (`sandbox/exaClient.ts`)
- [x] Groq client implemented (`sandbox/llmClient.ts`)
- [x] Agent updated to use both services
- [x] Environment variables configured
- [x] Error handling and fallbacks
- [x] Logging and monitoring
- [x] Documentation complete

**Status**: ✅ **FULLY INTEGRATED AND READY TO USE**

---

*Both sponsor integrations are production-ready. Just add your API keys and start debugging!*
