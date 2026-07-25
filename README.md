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
  <a href="https://marketplace.visualstudio.com/items?itemName=robertpiosik.gemini-coder"><img src="https://img.shields.io/badge/Install-VS_Code_Marketplace-blue" alt="Get from Visual Studio Code Marketplace" /></a> <a href="https://open-vsx.org/extension/robertpiosik/gemini-coder"><img src="https://img.shields.io/badge/Install-Open_VSX_Registry-a60ee5" alt="Get from Open VSX Registry" /></a> 
</p>

Free AI coding with static context. **Start in VS Code (Cursor, Antigravity, VSCodium, etc.), then continue in ChatGPT, Gemini, Claude, etc.** or _Bring Your Own Key_ to stay in the editor!

Get involved! Join our [discord server](https://discord.gg/KJySXsrSX5).

> [!TIP]
> Elevate your workflow with smart workspaces (called [projects](https://help.openai.com/en/articles/10169521-projects-in-chatgpt), [gems](https://gemini.google/pl/overview/gems), or [spaces](https://docs.github.com/en/copilot/concepts/context/spaces)).

<br/>

<p align="center"><img src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/media/screenshot-1.png"></p>

## Introduction

This independent project aims to provide developers a complete and free toolkit for pair programming with AI that augments, rather than replaces, traditional coding.

## Privacy

CWC operates 100% on your machine—no code, prompts or usage data are collected. For transparency, its source code is public on GitHub.

## Static context

To make AI coding as fast, accurate and cost-efficient as possible, CWC relies on static context. This means all task-relevant files are sent together with the prompt in a unified message, so the model has everything it needs from the start, without a single tool call.

> [!TIP]
> Get help with relevant file selection using keywords, symbol-references or _Find Relevant Files_ [prompt type](#prompt-types).

## Prompt types

At its core, CWC constructs simple, markdown-formatted prompts for common use-cases (click to expand) you can copy and paste into chatbot of choice or send directly from the editor via an API call.

<details>
<summary><strong>Edit files</strong></summary>

_Accurate and fast multi-file edits in a single response._

```
# Files
[full contents of selected files with paths]

# System
[edit format instructions (~250 tokens)]

---

[prompt]
```

</details>

<details>
<summary><strong>Ask about files</strong></summary>

_Get help with whatever you're up to._

```
# Files
[full contents of selected files with paths]

---

[prompt]
```

</details>

<details>
<summary><strong>Code at cursor</strong></summary>

_TAB completions from SOTA reasoning models._

````
# Files
[full contents of selected files with paths]

### File: `[active file]`
```
[code before cursor]<missing_text>[prompt]</missing_text>[code after cursor]
```

[instructions for the missing text]
````

</details>

<details>
<summary><strong>Find relevant files</strong></summary>

_Select files relevant to a natural language query._

```
# Files
[broad file selection]

# System
[response format instructions]

---

Find a complete set of files relevant to the following query. Include the primary files as well as any structural files.
[prompt]
```

</details>

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
- Meta
- Mistral
- Open WebUI
- OpenRouter
- Qwen
- Together
- Yuanbao
- Z

> [!IMPORTANT]
> The _Apply response_ button placed under responses is not a means of automatic output extraction, it's an alias for the original _copy to clipboard_ button. Review the [content script](https://github.com/robertpiosik/CodeWebChat/blob/dev/apps/browser/src/content-scripts/send-prompt-content-script/send-prompt-content-script.ts) to learn about implementation details.

> [!NOTE]
> Use [forwarding](https://code.visualstudio.com/docs/debugtest/port-forwarding) of port _55155_ when using remote machine via SSH.

## Prompt caching

CWC orders context files by modification and selection recency. This, combined with instructions placement at the message's very end effecively utilizes [prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching) across tasks.

Make your chatbot quota last longer, lower input token costs by up to 90%, and reduce latency by up to 80%!

## Commands

### Code at Cursor

- `Code at Cursor` - Get an inline snippet while using the current context.
- `Code at Cursor using...` - Inline snippet with configuration selection.
- `Code at Cursor with Instructions` - Inline snippet with instructions.
- `Code at Cursor with Instructions using...` - Inline snippet with instructions and configuration selection.

### Context

- `Save File Selection...` - Save the current context.
- `Restore File Selection...` - Restore a saved context.
- `Select Workspace File...` - Select a file from the workspace.
- `Search Files...` - Select files based on a search query.
- `Select Clipboard Paths...` - Select files based on paths in your clipboard.
- `Select Unstaged Files...` - Select files with unstaged changes.
- `Select Files of Commit...` - Select files modified in a specific commit.
- `Select Changed Files...` - Select changed files compared to a branch.

### Copy

- `Copy Markdown` - Copy contents of selected files to the clipboard.
- `Copy Markdown of Open Editors` - Copy contents of open editors to the clipboard.
- `Copy Paths` - Copy paths of selected files to the clipboard.
- `Copy Paths of Open Editors` - Copy paths of open editors to the clipboard.

### Commit messages

- `Commit Changes` - Generate commit message in your preferred style and commit.

### History

- `History` - Manage saved states of the workspace.
- `Create New Checkpoint` - Create a history entry of the workspace state.

### Actions

- `Apply from Clipboard` - Apply a chat response to the codebase.

### Misc

- `Duplicate Workspace` - Open a duplicate workspace preserving context.

## Build from source

### Prerequisites

- [Node.js](https://nodejs.org/) (v20.x recommended)
- [pnpm](https://pnpm.io/)

### Steps

1. Clone the repository:
   `git clone https://github.com/robertpiosik/CodeWebChat.git && cd CodeWebChat`
2. Install workspace dependencies:
   `pnpm install`
3. Navigate to the editor app and build the package:
   `cd apps/editor && pnpm run build`
4. Install the generated `.vsix` file in VS Code:
   Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`), run **Extensions: Install from VSIX...**, and select the newly created file.

<hr />

Copyright © 2026 [Robert Piosik](https://x.com/robertpiosik) \
E-mail: robertpiosik@gmail.com \
Telegram: robertpiosik
