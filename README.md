# Code Web Chat

<a href="https://marketplace.visualstudio.com/items?itemName=robertpiosik.gemini-coder" target="_blank"><img src="https://img.shields.io/badge/Install-VS_Code_Marketplace-blue" alt="Get from Visual Studio Code Marketplace" /></a> <a href="https://open-vsx.org/extension/robertpiosik/gemini-coder" target="_blank"><img src="https://img.shields.io/badge/Install-Open_VSX_Registry-a60ee5" alt="Get from Open VSX Registry" /></a> <a href="https://github.com/robertpiosik/CodeWebChat/blob/dev/LICENSE" target="_blank"><img src="https://img.shields.io/badge/License-GPL--3.0-green.svg" alt="GPL-3.0 license" /></a>

Context-first AI coding extension for VS Code, Cursor, and others.

✅ **Send prompts anywhere**

- Chatbots—_ChatGPT, Claude, Gemini, Grok, DeepSeek, etc._
- Model providers—_Gemini API, OpenRouter, local Ollama, etc._

✅ **Apply responses**—changes integration in all edit formats with easy rollback \
✅ **Fully featured**—code completions, commit messages, checkpoints, and more \
❤️ **Free and open-source**—highly capable tooling freely accessible to everyone \
🔒 **Privacy-focused**—runs 100% on your machine, with **zero remote processing** \
🏠️ **Local friendly**—easy on smaller models thanks to **zero tool-calling design** \
🌱 **Efficient**—simple, cacheable prompts, with **zero overhead**

<p>
<img src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/packages/shared/src/media/screenshot.png" alt="Screenshot" />
</p>

## Introduction

**LLMs are brilliant, yet mindless pattern matchers.** Because they lack properties similar to mental models, they can't _imagine_ how the correct output should look like _before_ their context is filled with relevant files.

To mitigate this limitation, so-called _agentic_ tools ask you to prepare extensive markdown-based plans and feature descriptions, so the system based on a keyword matching (via _grep_ tool calling) can do a better job at automated context compilation. It's a time consuming, token-hungry hit-or-miss.

**Code Web Chat proposes a mindful 🧠, aligned with true model's capabilities approach**—make the model guide itself with hand-picked files and straightforward instructions, not vague markdowns. **With it comes a big win**—as you work on a task your context becomes largely fixed (recently updated files and your changing instructions are always at the very end), therefore **cache is hit most of the time, making AI coding too cheap to meter!**

**This, combined with the latest generation of models** like Gemini 3.0 Flash and Pro which excel at long context understanding and diff correctness, **marks the new generation of AI coding tools**.

**10X** the speed, **0.1X** the cost, and accuracy that can't get any better.

### **Context-first approach**

Meet a simple **non-agentic workflow**—select files, enter instructions, and send message with your favorite chatbot or a model provider of choice.

> [!TIP]
> LLMs are pattern matchers—they love examples! Guide the model with context for production-grade code.

Constructed prompt is straightforward and focus the model's whole attention on the task. Example:

```
<system>
Whenever showing a new, updated, renamed or deleted file...
</system>
<files>
<file path="src/calculator.ts">
export const addNumbers = (a: number, b: number) => a + b;
</file>
</files>
<system>
Whenever showing a new, updated, renamed or deleted file...
</system>
Implement a subtract function.
```

Once the response is generated, a built-in parser extracts code blocks with file edits for a one-click, interactive changes integration.

## Browser integration

Install CWC's Connector extension in your favorite browser to 1) place the message directly in a project/space of your favorite chatbot, 2) include markdown-parsed websites in context. Like all of Code Web Chat, the extension is [open-source](https://github.com/robertpiosik/CodeWebChat/blob/dev/packages/browser) and works with minimal permissions for your absolute privacy and security.

- [Chrome Web Store](https://chromewebstore.google.com/detail/code-web-chat-connector/ljookipcanaglfaocjbgdicfbdhhjffp)
- [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/code-web-chat-connector/)

**Supported chatbots**

- AI Studio
- ChatGPT
- Claude
- Copilot
- DeepSeek
- Doubao
- Gemini
- GitHub Copilot
- Grok
- HuggingChat
- Kimi
- LMArena
- Mistral
- Open WebUI
- OpenRouter
- Perplexity
- Qwen
- Together
- Yuanbao
- Z AI

> [!TIP]
> With the browser extension you can include markdown-parsed websites in context. Go to target website, click the extension's icon in the browser's toolbar and click _Enable for context_.

> [!IMPORTANT]
> The _Apply response_ button placed under responses is not a means of automatic output extraction, it's an alias for the original _copy to clipboard_ button. Review the [content script](https://github.com/robertpiosik/CodeWebChat/blob/dev/packages/browser/src/content-scripts/send-prompt-content-script/send-prompt-content-script.ts) for implementation details.

## API Tools

Anything CWC can do in chatbots, it can do calling model providers directly from the editor.

> [!TIP]
> Get started by bringing your own API key of a model provider like [Google](https://aistudio.google.com/api-keys), [Mistral](https://console.mistral.ai/api-keys) or [Cerebras](https://cloud.cerebras.ai/).

**🛠️ Edit Context** \
Modify, create or delete files based on natural language instructions.

**🛠️ Code Completions** \
Get accurate code-at-cursor from state-of-the-art reasoning models.

**🛠️ Intelligent Update** \
Handle the compact "truncated" edit format and malformed diffs.

**🛠️ Commit Messages** \
Generate meaningful summaries of changes adhering to your style.

## Commands

### Code completions

- `Code Web Chat: Code Completion` - Get code-at-cursor using API tool.
- `Code Web Chat: Code Completion using...` - ...with configuration selection.
- `Code Web Chat: Code Completion with Instructions` - ...with instructions.
- `Code Web Chat: Code Completion with Instructions using...` - ...with instructions and configuration selection.

### Checkpoints

- `Code Web Chat: Checkpoints` - Restore the overall workspace state to the saved checkpoint.
- `Code Web Chat: Create New Checkpoint` - Save the current state of the workspace.

### Context

- `Code Web Chat: Save Context` - Save the currently checked files as a named context for easy reuse.
- `Code Web Chat: Apply Context` - Apply a saved context to either replace or merge with the currently checked files.
- `Code Web Chat: Add File to Context` - Search and add file (or parent folder via file action) to the context.
- `Code Web Chat: Remove File from Context` - Search and remove file (or parent folder via file action) from the context.
- `Code Web Chat: Copy Context` - Copy XML-formatted checked files from the Workspace view to the clipboard.
- `Code Web Chat: Copy Context of Open Editors` - Copy XML-formatted checked files from the Open Editors view to the clipboard.
- `Code Web Chat: Find Paths in Clipboard` - Select files based on paths found in the clipboard text.

## Enterprise security

**Code Web Chat operates exclusively on your machine.** Your code and instructions are sent directly to chatbots via editor-browser communication channel run on local Websockets. For API tools, model providers are called directly.

## Community

If you have a question, or want to help others, you're always welcome in our community.

- [Discord server](https://discord.gg/KJySXsrSX5)
- [GitHub Discussions](https://github.com/robertpiosik/CodeWebChat/discussions)

## Contributing

All contributions are welcome. Feel free to submit pull requests, feature requests and bug reports.

<hr />

Copyright © 2025 [Robert Piosik](https://x.com/robertpiosik) \
E-mail: robertpiosik@gmail.com \
Telegram: @robertpiosik
