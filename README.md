<p align="center">
  <a href="https://codeweb.chat">
    <picture>
      <source srcset="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/packages/shared/src/media/readme-heading-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/packages/shared/src/media/readme-heading-light.svg" media="(prefers-color-scheme: light)">
      <img src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/packages/shared/src/media/logo-light.png" alt="Logo" width="680">
    </picture>
  </a>
</p>
<h3 align="center">Blazing fast AI coding with chatbots/APIs</h3>
<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=robertpiosik.gemini-coder"><img src="https://img.shields.io/badge/Install-VS_Code_Marketplace-blue" alt="Get from Visual Studio Code Marketplace" /></a> <a href="https://open-vsx.org/extension/robertpiosik/gemini-coder"><img src="https://img.shields.io/badge/Install-Open_VSX_Registry-a60ee5" alt="Get from Open VSX Registry" /></a> <a href="https://github.com/robertpiosik/CodeWebChat/blob/dev/LICENSE"><img src="https://img.shields.io/badge/License-GPL--3.0-green.svg" alt="GPL-3.0 license" /></a>
</p>

Code Web Chat is a free and open-source AI coding toolkit **designed for speed and privacy**. You can use CWC in **VS Code** family of editors (Cursor, Antigravity, etc.) for a **much faster\*** development experience.

<sup>\* Compared to coding agents.</sub>

✍️ **Construct coding prompts for...**

- Chatbots—_ChatGPT, Gemini, Claude, Grok, DeepSeek, etc._
- APIs—_Gemini API, OpenRouter, local Ollama, etc._

💅 **Apply responses**—interactive edits integration with checkpoints for state restoration \
🤙 **Fully-featured**—code completions with reasoning models, commit messages, and more \
🫰 **Cost-efficient**—zero-overhead prompts optimized for [prompt caching](https://platform.openai.com/docs/guides/prompt-caching) \
✋ **Privacy-first**—zero telemetry, operates 100% on your machine

<p>
<img src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/packages/shared/src/media/screenshot.png" alt="Screenshot" />
</p>

## Introduction

With its **focus on context engineering**, CWC addresses pitfalls of coding agents.

### The problem

We believe the **agentic context retrieval is inherently flawed**. Since the model has to first read the keyword-matched file to understand its role, **context is polluted by default**. That may cause it reason about wrong things, leading to regressions. These could be overwhelmingly hard to fix with the very approach that created them.

### The solution

CWC proposes a **non-agentic approach**, where all the necessary for the task files, includnig useful examples, are picked with engineer's intent. Such guided model is easy to prompt and as accurate as it can get.

When pair-programming with Code Web Chat you foster codebase understanding, iterate on changes easier review, and enter the flow state like in the good old days!

## Enabling autofill in browser

Start using [projects](https://help.openai.com/en/articles/10169521-projects-in-chatgpt) (also called [gems](https://gemini.google/pl/overview/gems) or [spaces](https://docs.github.com/en/copilot/concepts/context/spaces)) without a tedious copy and paste!

- [Chrome Web Store](https://chromewebstore.google.com/detail/code-web-chat-connector/ljookipcanaglfaocjbgdicfbdhhjffp)
- [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/code-web-chat-connector/)

Like all of CWC, the extension is [open-source](https://github.com/robertpiosik/CodeWebChat/blob/dev/packages/browser) and works with minimal permissions for your absolute privacy and security.

**List of supported chatbots:**

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
- Qwen
- Together
- Yuanbao
- Z AI

> [!TIP]
> With the browser extension you can include markdown-parsed websites in context. Go to target website, click the extension's icon in the browser's toolbar and click _Enable for context_.

> [!IMPORTANT]
> The _Apply response_ button placed under responses is not a means of automatic output extraction, it's an alias for the original _copy to s_ button. Review the [content script](https://github.com/robertpiosik/CodeWebChat/blob/dev/packages/browser/src/content-scripts/send-prompt-content-script/send-prompt-content-script.ts) for implementation details.

> [!NOTE]
> Use [port forwarding](https://code.visualstudio.com/docs/debugtest/port-forwarding) on port _55155_ when using remote machine via SSH.

## API tools for common tasks

**🛠️ Edit Context** \
Work on your codebase with natural language instructions.

**🛠️ Code Completions** \
Get accurate code at cursor from reasoning models.

**🛠️ Intelligent Update** \
Fix malformed AI responses.

**🛠️ Commit Messages** \
Meaningful summaries of changes adhering to your style.

## Enterprise security

**Code Web Chat operates exclusively on your machine.** Your prompts are sent directly to chatbots via editor-browser communication channel run on local Websockets. For API tools, model providers are called directly.

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

- `Code Web Chat: Apply Context` - Apply a saved context or save the current file selection.
- `Code Web Chat: Add File to Context` - Search and add file (or parent folder via file action) to the context.
- `Code Web Chat: Remove File from Context` - Search and remove file (or parent folder via file action) from the context.
- `Code Web Chat: Copy Context` - Copy XML-formatted checked files from the Workspace view to the clipboard.
- `Code Web Chat: Copy Context of Open Editors` - Copy XML-formatted checked files from the Open Editors view to the clipboard.
- `Code Web Chat: Find Paths in Clipboard` - Select files based on paths found in the clipboard text.

## Contributing

All contributions are welcome. Feel free to submit pull requests, feature requests and bug reports.

<hr />

Copyright © 2025 [Robert Piosik](https://x.com/robertpiosik) \
E-mail: robertpiosik@gmail.com \
Telegram: robertpiosik
