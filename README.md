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

<p align="center"><strong>Blazing fast AI coding for VS Code</strong></p>

<p align="center"><i>chatbots, APIs, CLIs</br>free and privacy-first</i></p>

<p align="center"><img src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/media/screenshot-1.png"></p>

## Privacy

**CWC** operates 100% on your machine—no code, prompts or usage data are collected.

## Introduction

This independently built toolkit helps construct zero-overhead prompts in an effective workflow.

#### The workflow

1. Select task-relevant files with the help of [Agentic Search](#-agentic-search).
2. Select examples for model guidance.
3. Send prompts with chatbots, coding agents or api calls.

#### Efficiency and speed

- For the powerful [Agentic Search](#-agentic-search), SOTA models offer diminishing returns over cheap mid-tiers.
- Static context feeding lightweight prompts, makes intent easy to unpack, thus reasoning short or even optional.

## Targets

### 👉 WEB

Copy & paste into chatbots. Autofill prompts with [the official browser extension](https://github.com/robertpiosik/CodeWebChat/tree/dev/apps/browser).

> [!TIP]
> Elevate your workflow with smart workspaces (called [projects](https://help.openai.com/en/articles/10169521-projects-in-chatgpt), [gems](https://gemini.google/pl/overview/gems), or [spaces](https://docs.github.com/en/copilot/concepts/context/spaces)).

<details>
<summary>SUPPORTED CHATBOTS</summary>

```
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
```

</details>

### 👉 API

Send requests directly to OpenAI-API-compatible model providers.

### 👉 CLI

Run your favorite coding agent.

<details>
<summary>SUPPORTED AGENTS</summary>

```
- Antigravity
- Claude Code
- Codex
- Cursor
- Grok Build
- Muse Code
- OpenCode
```

</details>

## Prompts

Overview of CWC-constructed prompts.

### 📄 Agentic search

_Find task-relevant files through automated codebase discovery._

<details>
<summary>AGENT</summary>

```
# Task

In the project, find the complete set of primary and structural files relevant to the query.

# Output formatting

Output strictly as a bulleted list of file paths without explanations or any other text (e.g., - `path/to/file.ext`).

# Query

[INSTRUCTIONS]
```

</details>

### 📄 Intelligent search

_A quick way for task-relevant files from a single message._

<details>
<summary>WEB</summary>

```
# Files

[WORKSPACE FILES, A FOLDER OR SELECTED FILES]

# Task

Among the attached files, find the complete set of primary and structural files relevant to the query.

# Output formatting

Your response must begin with "**Intelligent file search results:**", then a bulleted list of file paths, followed by a brief explanation. Example:

**Intelligent file search results:**

- `src/index.ts`
- `src/greetings/hello.ts`
- `src/greetings/welcome.ts`

These files contain the core greeting logic and module exports.

# Query

[INSTRUCTIONS]
```

</details>

<details>
<summary>API</summary>

```
# Files

[WORKSPACE FILES, A FOLDER OR SELECTED FILES]

# Task

Among the attached files, find the complete set of primary and structural files relevant to the query.

# Output formatting

Output strictly as a bulleted list of file paths without explanations or any other text. Example:

- `src/index.ts`
- `src/greetings/hello.ts`
- `src/greetings/welcome.ts`

# Query

[INSTRUCTIONS]
```

</details>

### 📄 Editing

_Implementing new features, fixing bugs or doing refactors._

<details>
<summary>WEB/API</summary>

```
# Files

[SELECTED FILES]

# Output formatting

Whenever showing a new, updated, renamed, or deleted file, provide a brief explanation, then print the path in a markdown heading (e.g. ### New file: `src/examples/hello.py`, ### Updated file: `src/examples/hello.py`, ### Renamed file: `src/examples/hello.py` (old) `src/welcome.py` (new), ### Deleted file: `src/examples/hello.py`), followed by a markdown code block showing the original and updated code snippets with Git-style merge conflict syntax. Example:

[EXAMPLE]

# Task

[INSTRUCTIONS]
```

</details>

<details>
<summary>CLI</summary>

```
# Files

[SELECTED FILES]

# Task scope

Before you proceed with [the task](#task), you must read all files provided as project-relative paths in [files](#files), and nothing else.

# Task

[INSTRUCTIONS]
```

</details>

### 📄 Asking

_Multi-purpose: explanations, code reviews, you name it._

<details>
<summary>WEB/API</summary>

```
# Files

[SELECTED FILES]

# Task

[INSTRUCTIONS]
```

</details>

<details>
<summary>CLI</summary>

```
# Files

[SELECTED FILES]

# Task scope

Before you proceed with [the task](#task), you must read all files provided as project-relative paths in [files](#files), and nothing else.

# Task

[INSTRUCTIONS]
```

</details>

### 📄 Code at cursor

_TAB completions from SOTA reasoning models._

<details>
<summary>WEB</summary>

```
# Files

[SELECTED FILES]

### File `[ACTIVE FILE PATH]`

[PREFIX]<missing_text>[INSTRUCTIONS]</missing_text>[SUFFIX]

# Output formatting

Your response must begin with a markdown heading identifying the file and the cursor position, followed by a markdown code block containing the replacement text, followed by a brief explanation. The heading must be: "### Code at cursor: `[ACTIVE FILE PATH]` (ROW:COL)". Always refer to the symbol "<missing_text>" as "cursor position" and "replacement" as "completion". Example:

[EXAMPLE]

---

Find correct replacement text for the <missing_text> symbol.
```

</details>

<details>
<summary>API</summary>

```
# Files

[SELECTED FILES]

### File `[ACTIVE FILE PATH]`

[PREFIX]<missing_text>[INSTRUCTIONS]</missing_text>[SUFFIX]

# Output formatting

Find correct replacement for the <missing_text> symbol. Respond with replacement text within "replacement" XML tags, without explanations or any other text.
Example:
<replacement>!== undefined</replacement>'
```

</details>

### 📄 Commit messages

_Generate commit messages based on staged changes and context files._

<details>
<summary>WEB/API</summary>

```

# Files

[SELECTED FILES WHEN EDITS WERE ACCEPTED]

# Changes

[STAGED CHANGES]

# Output formatting

Your response must begin with "**Commit message:**", then proceed with the message. Example:

**Commit message:** Bump version to 1.0.1

# Task

Write a brief and precise summary for the changes, limited to a single sentence. Because the summary will be used for a commit message, don't use any markdown formatting and don't include a trailing dot. Use an imperative tone to ensure clarity and focus on the primary change or purpose.
```

</details>

### 📄 Patch repair

_Applying malformed edits generated by chatbots and APIs._

<details>
<summary>WEB/API</summary>

```
[ORIGINAL FILE]

[MALFORMED EDITS]

# Output formatting

Your response must begin with a markdown heading identifying the file, followed by a markdown code block containing the updated file. The heading must be: "### Patch repair: `path/to/file.ext`". Example:

[EXAMPLE]

# Task

Apply the attached changes to the file without explanations or any other text.
```

</details>

## Prompt caching

**CWC** orders context files by modification and selection recency. This, combined with instructions placement at the message's very end effecively utilizes prompt caching. Even across related tasks.

## Commands

### Code at Cursor

- `Code at Cursor` - Get an inline snippet while using the current context.
- `Code at Cursor using...` - Inline snippet with configuration selection.
- `Code at Cursor with Instructions` - Inline snippet with instructions.
- `Code at Cursor with Instructions using...` - Inline snippet with instructions and configuration selection.

### Context

- `Save File Selection` - Save the current context.
- `Restore File Selection` - Restore a saved context.
- `Select Workspace File...` - Select a file from the workspace.
- `Search Files...` - Find files based on a search query.
- `Search in Selected Files...` - Find within currently selected files.
- `Agentic Search...` - Find task-relevant files using a headless CLI invocation.
- `Select Clipboard Paths...` - Select files based on paths in your clipboard.
- `Select Unstaged Files...` - Select files with unstaged changes.
- `Select Files of Commit...` - Select files modified in a specific commit.

### Copy

- `Copy Markdown` - Copy contents of the current file selection.
- `Copy Markdown of Open Editors` - Copy contents of file selection in open editors.
- `Copy Paths...` - Copy paths of the current file selection.
- `Copy Paths of Open Editors...` - Copy paths of file selection in open editors.

### Commit messages

- `Commit Changes` - Generate commit message in your preferred style and commit.

### History

- `History` - Manage saved states of the workspace.
- `Create New Checkpoint` - Create a history entry of the workspace state.

### Actions

- `Apply Chat Response` - Integrate LLM response.

### Misc

- `Duplicate Workspace` - Copy the extension's state in a new window.

## Building from source

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
E-mail: robertpiosik@gmail.com
