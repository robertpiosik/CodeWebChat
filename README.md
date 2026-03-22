<p align="center" title="Code Web Chat">
  <a href="https://codeweb.chat">
    <picture>
      <source srcset="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/media/readme-heading-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/media/readme-heading-light.svg" media="(prefers-color-scheme: light)">
      <img alt="Logo" width="680" src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/media/readme-heading-light.svg">
    </picture>
  </a>
</p>
<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=robertpiosik.gemini-coder"><img src="https://img.shields.io/badge/Install-VS_Code_Marketplace-blue" alt="Get from Visual Studio Code Marketplace" /></a> <a href="https://open-vsx.org/extension/robertpiosik/gemini-coder"><img src="https://img.shields.io/badge/Install-Open_VSX_Registry-a60ee5" alt="Get from Open VSX Registry" /></a> <a href="https://github.com/robertpiosik/CodeWebChat/blob/dev/LICENSE"><img src="https://img.shields.io/badge/License-GPL--3.0-green.svg" alt="GPL-3.0 license" /></a>
</p>

Code Web Chat (CWC) is a free and open-source, privacy-first **AI coding toolkit for VS Code**. It helps construct zero-overhead, XML-formatted prompts with files and instructions for:

- **chatbots**—ChatGPT, Claude, Gemini, etc.
- **APIs**—remote and local model providers

_Implement features and fix bugs without a single tool call, in mere seconds!_

<br/>

<p align="center">Select context files, type instructions...</p>

<p align="center"><img src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/media/screenshot-1.png"></p>

<br/>

<p align="center">Copy the response when ready...</p>

<p align="center"><img src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/media/screenshot-2.png"></p>

<br/>

<p align="center">Apply from clipboard...</p>

<p align="center"><img src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/media/screenshot-3.png"></p>

## Introduction

In the world of AI coding, agents like Claude Code or Codex rely on "Function Calling" (where the AI asks "the harness" to read a file, waits for the tool to respond, then reads another). CWC flips this by letting you provide context files upfront in a single, well-structured XML message:

```
---------------------------
"Edit context" prompt type.
---------------------------
<files>[the selected files]</files>
<system>[edit format instructions]</system>
[user-typed instructions]
```

Other prompt types, like "Code at cursor" follow a similar pattern.

Workflow based on a single turn exchanges facilitates persistent utilization of prompt caching.

## Prompt caching

With its static context approach, CWC offers first-class support for prompt caching. Make your chatbot quotas last longer or lower token costs by up to 90% when calling APIs. Minimize latency of self-hosted models.

## Enabling autofill

Install the [browser extension](https://github.com/robertpiosik/CodeWebChat/tree/dev/apps/browser) and never copy and paste again.

- [Chrome Web Store](https://chromewebstore.google.com/detail/autofill-for-code-web-chat/ljookipcanaglfaocjbgdicfbdhhjffp)
- [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/autofill-for-code-web-chat/)

**Supported chatbots:**

- AI Studio
- Arena
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
- Mistral
- Open WebUI
- OpenRouter
- Qwen
- Together
- Yuanbao
- Z AI

> [!TIP]
> Elevate your workflow with smart workspaces (called [projects](https://help.openai.com/en/articles/10169521-projects-in-chatgpt), [gems](https://gemini.google/pl/overview/gems), or [spaces](https://docs.github.com/en/copilot/concepts/context/spaces)).

> [!IMPORTANT]
> The _Apply response_ button placed under responses is not a means of automatic output extraction, it's an alias for the original _copy to clipboard_ button. Review the [content script](https://github.com/robertpiosik/CodeWebChat/blob/dev/apps/browser/src/content-scripts/send-prompt-content-script/send-prompt-content-script.ts) to learn about implementation details.

> [!NOTE]
> Use [forwarding](https://code.visualstudio.com/docs/debugtest/port-forwarding) of port _55155_ when using remote machine via SSH.

## Call APIs

CWC supports your software development efforts without leaving the editor. Bring Your Own Key (BYOK) for a model provider of choice. Self-host with [Ollama](https://ollama.com/search) or [LM Studio](https://lmstudio.ai/).

**Built-in API tools:**

- Intelligent Update
- Edit Context
- Code at Cursor
- Find Relevant Files
- Commit Messages
- Voice Input

## Enterprise security

**Zero [function calling](https://developers.openai.com/api/docs/guides/function-calling/)**. This design choice eliminates the risk of dangerous command executions and prompt injections.

**Operates exclusively on your machine**. When using the browser extension for prompt autofill, data is moved via editor-browser communication channel run on local Websockets. For API tools, model providers are called directly.

**Zero telemetry.** No usage data is collected and sent to third-party servers.

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

Copyright © 2026 [Robert Piosik](https://x.com/robertpiosik) \
E-mail: robertpiosik@gmail.com \
Telegram: robertpiosik
