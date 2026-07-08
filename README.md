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

Code Web Chat (CWC) is a chatbot-first AI coding tool. **Start in VS Code (Cursor, Antigravity, VSCodium, etc.), then continue in ChatGPT, Gemini, Claude (plus 15+ more)** or get the job done without leaving your editor!

It's free, fully-featured and doesn't collect telemetry.

Get involved! Join our [discord server](https://discord.gg/KJySXsrSX5).

> [!TIP]
> Elevate your workflow with smart workspaces (called [projects](https://help.openai.com/en/articles/10169521-projects-in-chatgpt), [gems](https://gemini.google/pl/overview/gems), or [spaces](https://docs.github.com/en/copilot/concepts/context/spaces)).

<br/>

<p align="center"><i>Select context files, type instructions...</i></p>

<p align="center"><img src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/media/screenshot-1.png"></p>

<br/>

<p align="center"><i>Paste in a chatbot...</i></p>

<p align="center"><img src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/media/screenshot-2.png"></p>

<br/>

<p align="center"><i>Review edits in the editor...</i></p>

<p align="center"><img src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/media/screenshot-3.png"></p>

## Introduction

In the world of AI coding, agents like Codex or Claude Code rely on "tool calling" (where the AI asks "the harness" to read a file, waits for the tool to respond, then reads another).

CWC flips this!

Here, selected in the explorer view files are sent to the model with your instructions so it has everything it needs to do the task. Get accurate multi-file edits in record time!

> [!TIP]
> **Not sure what files to select?** You can search files using phrase, keywords or **natural language** globally or within the selected folder.

**Generated prompts are structured as follows:**

<details>
<summary>Edit context</summary>

```
# Files
[file selection]

# System
[edit format instructions]

---

[prompt]
```

</details>

<details>
<summary>Ask about context</summary>

```
# Files
[file selection]

[prompt]
```

</details>

<details>
<summary>Code at cursor</summary>

````
# Files
[file selection]

### File: `[active file]`
```
[code before cursor]<missing_text>[prompt]</missing_text>[code after cursor]
```

[instructions for the missing text]
````

</details>

<details>
<summary>Find relevant files</summary>

```
# Files
[rough file selection]

# System
[response format instructions]

Find a complete set of relevant files according to the following query:

---

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

CWC orders selected files by modification recency. This, combined with its simple design based on single-turn model interactions, creates a workflow that is extremely cache-friendly.

Make your chatbot quota last longer, lower input token costs by up to 90%, and reduce latency by up to 80%.

## Privacy

- zero telemetry
- browser communication over localhost
- model providers called directly

## Commands

### Code at Cursor

- `Code at Cursor` - Get an inline snippet while using the current context.
- `Code at Cursor using...` - Inline snippet with configuration selection.
- `Code at Cursor with Instructions` - Inline snippet with instructions.
- `Code at Cursor with Instructions using...` - Inline snippet with instructions and configuration selection.

### Context

- `Apply Context` - Apply a saved context or save the current file selection.
- `Add File to Context` - Search and add file (or parent folder via file action) to the context.
- `Remove File from Context` - Search and remove file (or parent folder via file action) from the context.
- `Search Files for Context` - Search and add files containing specific keywords to the context.
- `Copy Context` - Copy all selected files to the clipboard.
- `Copy Context of Open Editors` - Copy opened and selected files to the clipboard.

### Commit messages

- `Commit Changes` - Generate commit message in your preferred style.

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
