<p align="center" title="Code Web Chat">
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

Code Web Chat is a free and open-source (FOSS), independent AI coding toolkit.

✍️ **Construct coding prompts for...**

- Chatbots—_[Gemini](https://gemini.google.com/app), [ChatGPT](https://chatgpt.com/), [Claude](https://claude.ai/), [Grok](https://grok.com/), [DeepSeek](https://chat.deepseek.com/), etc._
- APIs—_[Google](https://aistudio.google.com/api-keys), [OpenAI](https://platform.openai.com/api-keys), [OpenRouter](https://openrouter.ai/settings/keys), [local Ollama](https://ollama.com/search), etc._

💅 **Apply responses**—interactive multi-file changes integration \
🫰 **Cost-efficient**—optimized for [prompt caching](https://platform.openai.com/docs/guides/prompt-caching) across tasks \
✋ **Privacy-first**—strict zero telemetry policy

<p>
<img src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/packages/shared/src/media/screenshot.png" alt="Screenshot" />
</p>

## Introduction

With its focus on context engineering, CWC lets you pick all the necessary files, includnig useful examples, with engineer's intent. Such steered model doesn't need time consuming planning, makes all edits in a single request, and is as accurate as can get. The tool is a perfect companion for all kinds of coding tasks; from tedious refactors to complex features.

When pair-programming with Code Web Chat you foster codebase understanding, iterate on changes that are easy to review, and enter the flow state like in the good old days!

> “The only way to go fast, is to go well.” ― Robert C. Martin, Clean Architecture

## Enabling autofill in browser

Start using [projects](https://help.openai.com/en/articles/10169521-projects-in-chatgpt) (also called [gems](https://gemini.google/pl/overview/gems) or [spaces](https://docs.github.com/en/copilot/concepts/context/spaces)) without the tedious copy and paste!

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
Pair-programming using natural language instructions.

**🛠️ Intelligent Update** \
Integrate changes from malformed markdown code blocks.

**🛠️ Code Completions** \
Get accurate code at cursor from state-of-the-art models.

**🛠️ Prune Context** \
Remove irrelevant files from the current context selection.

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
- `Code Web Chat: Undo Context Selection` - Undo the last context change.
- `Code Web Chat: Redo Context Selection` - Redo the last undone context change.

## Contributing

All contributions are welcome. Feel free to submit pull requests, feature requests and bug reports.

<hr />

Copyright © 2025 [Robert Piosik](https://x.com/robertpiosik) \
E-mail: robertpiosik@gmail.com \
Telegram: robertpiosik
