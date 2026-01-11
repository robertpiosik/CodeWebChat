<p align="center">
  <a href="https://codeweb.chat">
    <picture>
      <source srcset="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/packages/shared/src/media/logo-dark.png" media="(prefers-color-scheme: dark)">
      <source srcset="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/packages/shared/src/media/logo-light.png" media="(prefers-color-scheme: light)">
      <img src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/packages/shared/src/media/logo-light.png" alt="Logo" width="160">
    </picture>
    <br />
    <br />
    <picture>
      <source srcset="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/packages/shared/src/media/code-web-chat-dark.png" media="(prefers-color-scheme: dark)">
      <source srcset="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/packages/shared/src/media/code-web-chat-light.png" media="(prefers-color-scheme: light)">
      <img src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/packages/shared/src/media/code-web-chat-light.png" alt="Code Web Chat" width="340" >
    </picture>
  </a>
</p>
<h3 align="center">Fast AI coding with chatbots/APIs</h3>
<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=robertpiosik.gemini-coder" target="_blank"><img src="https://img.shields.io/badge/Install-VS_Code_Marketplace-blue" alt="Get from Visual Studio Code Marketplace" /></a> <a href="https://open-vsx.org/extension/robertpiosik/gemini-coder" target="_blank"><img src="https://img.shields.io/badge/Install-Open_VSX_Registry-a60ee5" alt="Get from Open VSX Registry" /></a> <a href="https://github.com/robertpiosik/CodeWebChat/blob/dev/LICENSE" target="_blank"><img src="https://img.shields.io/badge/License-GPL--3.0-green.svg" alt="GPL-3.0 license" /></a>
</p>

**CWC** is a free and open-source, fully-featured AI coding extension **designed for speed**. Works with VS Code family of editors (Cursor, Antigravity, VSCodium, etc.).

👉️ **Construct simple coding prompts for...**

- Chatbots—_ChatGPT, Gemini, Claude, Grok, DeepSeek, etc._
- APIs—_Gemini API, OpenRouter, local Ollama, etc._

👉️ **Apply responses**—edits integration with checkpoints for state restoration \
👉️ **Fully featured**—code completions with any model, commit messages, and more \
🫰 **Cost-efficient**—zero-overhead prompts with smart file ordering for [prompt caching](https://platform.openai.com/docs/guides/prompt-caching)

<p>
<img src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/packages/shared/src/media/screenshot.png" alt="Screenshot" />
</p>

## Enabling autofill

Install the zero-setup Connector extension in your favorite browser and never copy and paste again!

- [Chrome Web Store](https://chromewebstore.google.com/detail/code-web-chat-connector/ljookipcanaglfaocjbgdicfbdhhjffp)
- [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/code-web-chat-connector/)

Like all of Code Web Chat, the extension is [open-source](https://github.com/robertpiosik/CodeWebChat/blob/dev/packages/browser) and works with minimal permissions for your absolute privacy and security.

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
> The _Apply response_ button placed under responses is not a means of automatic output extraction, it's an alias for the original _copy to clipboard_ button. Review the [content script](https://github.com/robertpiosik/CodeWebChat/blob/dev/packages/browser/src/content-scripts/send-prompt-content-script/send-prompt-content-script.ts) for implementation details.

> [!NOTE]
> Use [port forwarding](https://code.visualstudio.com/docs/debugtest/port-forwarding) on port _55155_ when using remote machine via SSH.

## API Tools

**🛠️ Edit Context** \
Modify, create or delete files based on natural language instructions.

**🛠️ Code Completions** \
Get accurate code-at-cursor from state-of-the-art reasoning models.

**🛠️ Intelligent Update** \
Handle the compact "truncated" edit format and malformed diffs.

**🛠️ Commit Messages** \
Generate meaningful summaries of changes adhering to your style.

> [!TIP]
> Get started with [Google](https://aistudio.google.com/api-keys) model provider. Gemini 3.0 Flash is excellent at long context and _diff_ editing.

## Enterprise security

**Code Web Chat operates exclusively on your machine.** Your code and instructions are sent directly to chatbots via editor-browser communication channel run on local Websockets. For API tools, model providers are called directly.

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
Telegram: @robertpiosik
