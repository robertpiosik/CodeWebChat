<p align="center" title="Code Web Chat">
  <a href="https://codeweb.chat">
    <picture>
      <source srcset="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/packages/shared/src/media/readme-heading-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/packages/shared/src/media/readme-heading-light.svg" media="(prefers-color-scheme: light)">
      <img src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/packages/shared/src/media/logo-light.png" alt="Logo" width="680">
    </picture>
  </a>
</p>
<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=robertpiosik.gemini-coder"><img src="https://img.shields.io/badge/Install-VS_Code_Marketplace-blue" alt="Get from Visual Studio Code Marketplace" /></a> <a href="https://open-vsx.org/extension/robertpiosik/gemini-coder"><img src="https://img.shields.io/badge/Install-Open_VSX_Registry-a60ee5" alt="Get from Open VSX Registry" /></a> <a href="https://github.com/robertpiosik/CodeWebChat/blob/dev/LICENSE"><img src="https://img.shields.io/badge/License-GPL--3.0-green.svg" alt="GPL-3.0 license" /></a>
</p>

Code Web Chat is an open-source and privacy-first **AI coding toolkit for VS Code**. It helps construct prompts for a chatbot's smart workspaces (called [projects](https://help.openai.com/en/articles/10169521-projects-in-chatgpt), also [gems](https://gemini.google/pl/overview/gems) or [spaces](https://docs.github.com/en/copilot/concepts/context/spaces)) and APIs. **It's free!**

<p align="center"><sub><i>Select context, type a prompt...</i></sub></p>

<p align="center"><img src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/packages/shared/src/media/screenshot-1.png"></p>

<p align="center"><sub><i>Interate in your favorite chatbot...</i></sub></p>

<p align="center"><img src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/packages/shared/src/media/screenshot-2.png"></p>

<p align="center"><sub><i>Apply response from clipboard...</i></sub></p>

<p align="center"><img src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/packages/shared/src/media/screenshot-3.png"></p>

> [!TIP]
> Don't want to make edits in chatbots? CWC supports remote and local (e.g. Ollama) model providers.

## Enabling autofill

Got tired with copy and paste? Enable prompt autofill with a browser extension ([source code](https://github.com/robertpiosik/CodeWebChat/tree/dev/apps/browser)).

- [Chrome Web Store](https://chromewebstore.google.com/detail/autofill-for-code-web-chat/ljookipcanaglfaocjbgdicfbdhhjffp)
- [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/autofill-for-code-web-chat/)

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

> [!IMPORTANT]
> The _Apply response_ button placed under responses is not a means of automatic output extraction, it's an alias for the original _copy to clipboard_ button. Review the [content script](https://github.com/robertpiosik/CodeWebChat/blob/dev/apps/browser/src/content-scripts/send-prompt-content-script/send-prompt-content-script.ts) to learn about implementation details.

> [!NOTE]
> Use [forwarding](https://code.visualstudio.com/docs/debugtest/port-forwarding) of port _55155_ when using remote machine via SSH.

## Built-in API tools

Bring your own key (BYOK) for a model provider of choice to use many of the built-in API tools.

**🛠️ Edit Context** \
Pair-programming using natural language instructions.

**🛠️ Intelligent Update** \
Integrate changes from malformed markdown code blocks.

**🛠️ Prune Context** \
Make the context task-focused.

**🛠️ Code at Cursor** \
Accurate inline code from reasoning models.

**🛠️ Voice Input** \
Transcribe speech to text in the prompt field.

**🛠️ Commit Messages** \
Meaningful summaries of changes in your style.

## Enterprise security

**Code Web Chat operates exclusively on your machine.** When using the browser extension for prompt autofill, data is moved via editor-browser communication channel run on local Websockets. For API tools, model providers are called directly.

**The tool does not collect telemetry.**

## Commands

### Code at Cursor

- `Code Web Chat: Code at Cursor` - Get an inline snippet while using the current context.
- `Code Web Chat: Code at Cursor using...` - Inline snippet with configuration selection.
- `Code Web Chat: Code at Cursor with Instructions` - Inline snippet with instructions.
- `Code Web Chat: Code at Cursor with Instructions using...` - Inline snippet with instructions and configuration selection.

### Checkpoints

- `Code Web Chat: Checkpoints` - Restore the overall workspace state to the saved checkpoint.
- `Code Web Chat: Create New Checkpoint` - Save the current state of the workspace.

### Context

- `Code Web Chat: Apply Context` - Apply a saved context or save the current file selection.
- `Code Web Chat: Add File to Context` - Search and add file (or parent folder via file action) to the context.
- `Code Web Chat: Remove File from Context` - Search and remove file (or parent folder via file action) from the context.
- `Code Web Chat: Search Files for Context` - Search and add files containing specific keywords to the context.
- `Code Web Chat: Copy Context` - Copy XML-formatted checked files from the Workspace view to the clipboard.
- `Code Web Chat: Copy Context of Open Editors` - Copy XML-formatted checked files from the Open Editors view to the clipboard.

### Commit messages

- `Code Web Chat: Commit Changes` - Generate commit message and commit.

## Contributing

All contributions are welcome. Feel free to submit pull requests, feature requests and bug reports.

<hr />

Copyright © 2025 [Robert Piosik](https://x.com/robertpiosik) \
E-mail: robertpiosik@gmail.com \
Telegram: robertpiosik
