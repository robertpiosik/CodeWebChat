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

Code Web Chat (CWC) is a free and open-source, privacy-first **AI coding toolkit for VS Code**. It helps construct zero-overhead, XML-formatted prompts for:

- **chatbots**—ChatGPT, Claude, Gemini, etc.
- **APIs**—remote and local model providers

...and apply multi-file edits, code at cursor, relevant files for context, and more!

> [!TIP]
> Elevate your workflow with smart workspaces (called [projects](https://help.openai.com/en/articles/10169521-projects-in-chatgpt), [gems](https://gemini.google/pl/overview/gems), or [spaces](https://docs.github.com/en/copilot/concepts/context/spaces)).

<br/>

<p align="center"><i>Select context files, type instructions...</i></p>

<p align="center"><img src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/media/screenshot-1.png"></p>

<br/>

<p align="center"><i>Send API request or autofill in chatbot...</i></p>

<p align="center"><img src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/media/screenshot-2.png"></p>

<br/>

<p align="center"><i>Preview response in the editor...</i></p>

<p align="center"><img src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/media/screenshot-3.png"></p>

## Introduction

In the world of AI coding, agents like Claude Code or Codex rely on "Function Calling" (where the AI asks "the harness" to read a file, waits for the tool to respond, then reads another). CWC flips this by letting you provide context files upfront for quality outputs in a matter of seconds.

**Zero-overhead, XML-formatted prompt types:**

<details>
<summary>Edit context</summary>

```
<files>[current file tree selection]</files>
<system>[edit format instructions]</system>
[user-typed prompt]
```

</details>

<details>
<summary>Ask about context</summary>

```
<files>[current file tree selection]</files>
[user-typed prompt]
```

</details>

<details>
<summary>Code at cursor</summary>

```
<files>
[current file tree selection]
<file path="[active file]">
[code before cursor]<missing_text>[user-typed prompt]</missing_text>[code after cursor]
</file>
</files>
[instructions for the missing text]
```

</details>

<details>
<summary>Find relevant files</summary>

```
<files>[current file tree selection]</files>
<system>[response format instructions]</system>
Find all files building modules of the following task's scope:
[user-typed prompt]
```

</details>

<details>
<summary>No context</summary>

```
[user-typed prompt]
```

</details>

## Prompt caching

With its static context approach, **[prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching) is utilized across tasks** via smart file ordering based on update and selection recency.

Make your chatbot quotas last longer or lower token costs by up to 90% when calling APIs. Minimize latency of self-hosted models.

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

> [!IMPORTANT]
> The _Apply response_ button placed under responses is not a means of automatic output extraction, it's an alias for the original _copy to clipboard_ button. Review the [content script](https://github.com/robertpiosik/CodeWebChat/blob/dev/apps/browser/src/content-scripts/send-prompt-content-script/send-prompt-content-script.ts) to learn about implementation details.

> [!NOTE]
> Use [forwarding](https://code.visualstudio.com/docs/debugtest/port-forwarding) of port _55155_ when using remote machine via SSH.

## Calling APIs

CWC includes all the essential API tools. Bring Your Own Key (BYOK) for a model provider of choice. Use self-hosted model provider like [Ollama](https://ollama.com/search) or [LM Studio](https://lmstudio.ai/).

- **Intelligent Update**—Integrate changes from malformed responses.
- **Edit Context**—Pair-programming using natural language instructions.
- **Code at Cursor**—Accurate inline code from reasoning models.
- **Find Relevant Files**—Find files using natural language description.
- **Commit Messages**—Meaningful summaries of changes in your style.
- **Voice Input**—Transcribe speech to text in the prompt field.

## Enterprise security

**Zero function calling**. This design choice eliminates the risk of dangerous command executions and prompt injections.

**Operates exclusively on your machine**. When using the browser extension for prompt autofill, data is moved via editor-browser communication channel run on local Websockets. For API tools, model providers are called directly.

**Zero telemetry.** No usage data is collected and sent to third-party servers.

## Commands

### Code at Cursor

- `Code at Cursor` - Get an inline snippet while using the current context.
- `Code at Cursor using...` - Inline snippet with configuration selection.
- `Code at Cursor with Instructions` - Inline snippet with instructions.
- `Code at Cursor with Instructions using...` - Inline snippet with instructions and configuration selection.

### Checkpoints

- `Checkpoints` - Restore the overall workspace state to the saved checkpoint.
- `Create New Checkpoint` - Save the current state of the workspace.

### Context

- `Apply Context` - Apply a saved context or save the current file selection.
- `Add File to Context` - Search and add file (or parent folder via file action) to the context.
- `Remove File from Context` - Search and remove file (or parent folder via file action) from the context.
- `Search Files for Context` - Search and add files containing specific keywords to the context.
- `Copy Context` - Copy XML-formatted checked files from the Workspace view to the clipboard.
- `Copy Context of Open Editors` - Copy XML-formatted checked files from the Open Editors view to the clipboard.

### Commit messages

- `Commit Changes` - Generate commit message and commit.

## Misc

- `Copy Edit Format Instructions` - Copy XML-formatted edit format instructions to the clipboard.

## Contributing

All contributions are welcome. Feel free to submit pull requests, feature requests and bug reports.

<hr />

Copyright © 2026 [Robert Piosik](https://x.com/robertpiosik) \
E-mail: robertpiosik@gmail.com \
Telegram: robertpiosik
