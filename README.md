<div align="center">
  <img src="https://raw.githubusercontent.com/robertpiosik/CodeWebChat/refs/heads/master/packages/vscode/media/logo.png" alt="logo" width="128" />
  <br />
  <h1>Code Web Chat</h1>
  <strong>Initialize your favorite chatbot, then apply the response with a single click</strong>
  <br />
  <br />
   <a href="https://marketplace.visualstudio.com/items?itemName=robertpiosik.gemini-coder" target="_blank"><img src="https://img.shields.io/badge/Download-VS_Code_Marketplace-blue" alt="Download from Visual Studio Code Marketplace" /></a>&nbsp;<a href="https://github.com/robertpiosik/CodeWebChat/blob/dev/LICENSE" target="_blank"><img src="https://img.shields.io/badge/License-GPL--3.0-blue" alt="Download from Visual Studio Code Marketplace" /></a>&nbsp;<a href="https://github.com/robertpiosik/CodeWebChat" target="_blank"><img src="https://img.shields.io/github/stars/robertpiosik/CodeWebChat" alt="stars" /></a><br /><a href="https://x.com/robertpiosik" target="_blank"><img src="https://img.shields.io/badge/Created_by-@robertpiosik-black?logo=x" alt="X" /></a>&nbsp;<a href="https://x.com/CodeWebChat" target="_blank"><img src="https://img.shields.io/badge/Follow-@CodeWebChat-black?logo=x" alt="X" /></a>&nbsp;<a href="https://www.reddit.com/r/CodeWebChat" target="_blank"><img src="https://img.shields.io/badge/Join-r%2FCodeWebChat-orange?logo=reddit&logoColor=white" alt="Join r/CodeWebChat" /></a><br />
   <a href="https://codeweb.chat/" target="_blank"><strong>Documentation</strong></a>
</div>

<br />

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Meet CWC</span>

100% free and open source VS Code extension for AI-assisted programming. CWC treats the AI model less like a teammate and more like a calculator; by giving you full control over the context, it modifies it predictably, accurately, quickly, thus cost-efficiently. Enjoy a modern software development workflow with a tool that doesn't try hard to replace You.

🧩 Compatible with VS Code derivatives (Cursor, Windsurf, VSCodium, etc.) \
🙋 Created by an independent developer

**Guiding principles:**

- initialize chatbots—don't scrape responses
- API tools—get the job done in a single request
- privacy first—zero telemetry
- lightweight—about 1MB of code

**CWC is for you if:**

- you're an experienced engineer working on a large codebase
- you're a student or hobbyist on a budget

**See how simple it is to implement a feature with ChatGPT:**

<p>
<img src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/packages/shared/src/media/demo.gif" alt="Walkthrough" />
</p>

**Workflow with CWC is simple and effective:**

<img src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/packages/shared/src/media/flow.png" alt="Flow" />

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Context selection</span>

With today's advancements in LLMs capabilities, the technology is dramatically accelerating the pace a new code is created through the work of coding agents. For some it is too fast too keep up though. Over time, they lose confidence in their understanding of the codebase they work on - verifying changes becomes challenging, making it easier for bugs or unintended behaviors to slip in.

CWC does not prompt-engineer any form of autonomous coding, instead, it expects programmer to be in the loop with the evolving codebase by manual context management.

The benefits of this friction include:

- developing a mental model of the codebase,
- eliminating idle time waiting for agentic runs to finish,
- predictability of AI-generated outputs.

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Chatbot initialization</span>

Code with your favorite chatbot without tedious copy-pasting and apply responses with a single click.

The Connector extension bridges your editor and the browser. Available for all Chrome and Firefox based browsers.

- [Chrome Web Store](https://chromewebstore.google.com/detail/code-web-chat-connector/ljookipcanaglfaocjbgdicfbdhhjffp)
- [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/gemini-coder-connector/)

<hr />

### Supported chatbots

**AI Studio** • **ChatGPT** • **Claude** • **DeepSeek** • **Doubao** • **Gemini** • **Grok** • **HuggingChat** • **Mistral** • **Open WebUI** • **OpenRouter Chat** • **Perplexity** • **Qwen** • **Yuanbao**

> <small>**Legal Disclaimer:** After chat initialization, the extension does not read the incoming message. The injected _Apply response_ button is not a means of automatic output extraction, it's an alias for the original _copy to clipboard_ button.</small>

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">API Tools</span>

CWC includes battle-tested must-have API tools.

### Code Completions

Get code at cursor from state-of-the-art reasoning models.

✅ Includes selected context \
✅ Designed for on-demand use

### Edit Context

Create and modify files in context based on natural language instructions.

✅ Multi-file updates in a single API call \
✅ Works like web chat->apply response

### Intelligent Update

When applying chat response, update files based on code blocks in truncated edit format and fix malformed diffs.

✅ Regenerates whole files in concurrent API calls \
✅ Smaller models like Gemini Flash are sufficient

### Commit Messages

Generate meaningful commit messages precisely adhering to your preferred style.

✅ Includes affected files in full \
✅ Customizable instructions

<hr />

### Predefined API providers

**Anthropic** • **Cerebras** • **Chutes** • **DeepInfra** • **DeepSeek** • **Fireworks** • **Gemini** • **Hyperbolic** • **Mistral** • **OpenAI** • **OpenRouter** • **TogetherAI**

ℹ️ Any OpenAI-API compatible endpoint works with CWC \
🔒️ API keys are [stored encrypted](https://code.visualstudio.com/api/references/vscode-api#SecretStorage)

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Commands</span>

### Code completions

- `Code Web Chat: Code Completion` - Get inline autocompletion at the cursor position.
- `Code Web Chat: Code Completion with Suggestions` - Get inline autocompletion at the cursor position that follows given suggestions.
- `Code Web Chat: Code Completion to Clipboard` - Copy inline autocompletion prompt to clipboard.
- `Code Web Chat: Code Completion with Suggestions to Clipboard` - Copy inline autocompletion with suggestions prompt to clipboard.
- `Code Web Chat: Code Completion in Chat` - Use chatbot for code completion.
- `Code Web Chat: Code Completion in Chat with...` - Use chatbot for code completion with selected preset.

### Editing context

- `Code Web Chat: Edit Context` - Create and modify files in context based on natural language instructions.

### Applying chat responses

- `Code Web Chat: Apply Chat Response` - Integrate with the codebase copied overall chat response or a single code block.
- `Code Web Chat: Revert Last Changes` - Revert last applied chat response or the Edit Context API tool use.

### Chat

- `Code Web Chat: Chat` - Type instructions and open chatbot with default preset.
- `Code Web Chat: Chat using...` - Type instructions and open chatbot with preset selection.
- `Code Web Chat: Chat to Clipboard` - Enter instructions and copy prompt to clipboard.

### Context

- `Code Web Chat: Copy Context` - Copy selected files and websites to clipboard.
- `Code Web Chat: Apply Context from Clipboard` - Sets the context by parsing file paths from clipboard text.

### Version Control

- `Code Web Chat: Commit Changes` - Generate a commit message for staged changes and commit.

### Misc

- `Code Web Chat: Settings` - Open settings wizard

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Settings</span>

### Chatbot initialization

- `Code Web Chat: Edit Format Instructions Truncated` - Style instructions for chat responses when using truncated format.

- `Code Web Chat: Edit Format Instructions Whole` - Style instructions for chat responses when showing complete files.

- `Code Web Chat: Edit Format Instructions Diff` - Style instructions for chat responses when using diff format.

### Commit Messages

- `Code Web Chat: Commit Message Instructions` - The instructions used when generating a commit message.

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Community</span>

Please be welcomed in [discussions](https://github.com/robertpiosik/CodeWebChat/discussions) and in our subreddit [/r/CodeWebChat](https://www.reddit.com/r/CodeWebChat).

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Donations</span>

If you find CWC helpful, please consider [supporting the project](https://buymeacoffee.com/robertpiosik). Thank you!

**BTC:** bc1qfzajl0fc4347knr6n5hhuk52ufr4sau04su5te

**ETH:** 0x532eA8CA70aBfbA6bfE35e6B3b7b301b175Cf86D

**XMR:** 84whVjApZJtSeRb2eEbZ1pJ7yuBoGoWHGA4JuiFvdXVBXnaRYyQ3S4kTEuzgKjpxyr3nxn1XHt9yWTRqZ3XGfY35L4yDm6R

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Contributing</span>

All contributions are welcome. Feel free to submit pull requests, feature requests and bug reports.

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">License</span>

Copyright © 2025-present [Robert Piosik](https://x.com/robertpiosik)
<br />E-mail: robertpiosik@gmail.com
<br />Telegram: @robertpiosik
<br />License: [GPL-3.0](https://github.com/robertpiosik/CodeWebChat/blob/master/LICENSE)
