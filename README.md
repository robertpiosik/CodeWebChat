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

<p align="center"><strong>Blazing fast AI coding</strong></p>

<p align="center"><i>Markdown prompts with seamless integration</i></p>

<p align="center">VS Code · Cursor · Antigravity</br><strong>Free chatbots</strong> · APIs · CLIs</p>

<p align="center"><img src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/media/screenshot-1.png"></p>

## Privacy-first

100% local operation means no code, prompts, or usage data are collected.

## Introduction

Autofill free chatbots in your web browser, send API requests, or headlessly invoke agentic CLIs using [markdown prompts](#markdown-prompts) with seamless integration. It's free!

> [!TIP]
>
> Click ▶ to expand.

<details>
<summary><strong>Attaching files</strong></summary>

Selected files are sent alongside task instructions in a single message.

</details>

<details>
<summary><strong>Effortless context selection</strong></summary>

[Agentic Search](#-agentic-search) prompt accurately selects relevant files hands-free.

</details>

<details>
<summary><strong>Iterations without context bloat</strong></summary>

Refine instructions without dragging old ones in an ever-growing conversation.

</details>

<details>
<summary><strong>Effective steering with examples</strong></summary>

Guide the model with broader context for outputs you're looking for.

</details>

<details>
<summary><strong>First-class support for prompt caching</strong></summary>

When including selected files, unchanged files are placed first, followed by recently modified ones, and task instructions are placed at the very end.

</details>

## Markdown Prompts

### 📄 Agentic Search

_Let your favorite agentic harness find relevant files._

<details>
<summary><strong>CLI</strong></summary>

```
# Task

In the project, find the complete set of primary and structural files relevant to the query.

# Output formatting

Output strictly as a bulleted list of file paths without explanations or any other text (e.g., - `path/to/file.ext`).

# Query

[INSTRUCTIONS]
```

</details>

### 📄 Editing

_Implement new features, fix bugs, refactor code._

<details>
<summary><strong>WEB/API</strong></summary>

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
<summary><strong>CLI</strong></summary>

```
# Files

[SELECTED FILES]

# Requirements

- All necessary files for the [task](#task) were preloaded to [files](#files). Reading other files is FORBIDDEN.
- Using tools or shell commands for discovery or information gathering (e.g., grep, glob, ls, git, etc.) is FORBIDDEN.
- Exception: If [task](#task) includes *.png image paths, read them using the appropriate tool.
- Exception: Perform file system operations (create, update, delete, rename, move) required to complete the [task](#task).

# Task

[INSTRUCTIONS]
```

</details>

### 📄 Asking

_Get explanations, plan features._

<details>
<summary><strong>WEB/API</strong></summary>

```
# Files

[SELECTED FILES]

# Task

[INSTRUCTIONS]
```

</details>

<details>
<summary><strong>CLI</strong></summary>

```
# Files

[SELECTED FILES]

# Requirements

- All necessary files for the [task](#task) were preloaded to [files](#files). Reading other files is FORBIDDEN.
- Using tools or shell commands for discovery or information gathering (e.g., grep, glob, ls, git, etc.) is FORBIDDEN.
- Exception: If [task](#task) includes *.png image paths, read them using the appropriate tool.

# Task

[INSTRUCTIONS]
```

</details>

### 📄 Intelligent Search

_Narrow-down broader file selection._

<details>
<summary><strong>WEB</strong></summary>

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
<summary><strong>API</strong></summary>

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

<details>
<summary><strong>CLI</strong></summary>

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

# Requirements

- All necessary files for the [task](#task) were preloaded to [files](#files). Reading other files is FORBIDDEN.
- Using tools or shell commands for discovery or information gathering (e.g., grep, glob, ls, git, etc.) is FORBIDDEN.

# Query

[INSTRUCTIONS]
```

</details>

### 📄 Code at Cursor

_Quality TAB completions from reasoning models._

<details>
<summary><strong>WEB</strong></summary>

````
# Files

[SELECTED FILES]

### File: `[ACTIVE FILE PATH]`

```
[PREFIX]<missing_text>[INSTRUCTIONS]</missing_text>[SUFFIX]
```

# Output formatting

Your response must begin with a markdown heading identifying the file and the cursor position, followed by a markdown code block containing the replacement text, followed by a brief explanation. The heading must be: "### Code at cursor: `[ACTIVE FILE PATH]` (ROW:COL)". Always refer to the symbol "<missing_text>" as "cursor position" and "replacement" as "completion". Example:

[EXAMPLE]

# Task

Find correct replacement text for the <missing_text> symbol.
````

</details>

<details>
<summary><strong>API</strong></summary>

````
# Files

[SELECTED FILES]

### File: `[ACTIVE FILE PATH]`

```
[PREFIX]<missing_text>[INSTRUCTIONS]</missing_text>[SUFFIX]
```

# Output formatting

Respond with replacement text within "replacement" XML tags, without explanations or any other text.
Example:
<replacement>!== undefined</replacement>

# Task

Find correct replacement text for the <missing_text> symbol.
````

</details>

<details>
<summary><strong>CLI</strong></summary>

````
# Files

[SELECTED FILES]

### File: `[ACTIVE FILE PATH]`

```
[PREFIX]<missing_text>[INSTRUCTIONS]</missing_text>[SUFFIX]
```

# Output formatting

Respond with replacement text within "replacement" XML tags, without explanations or any other text.
Example:
<replacement>!== undefined</replacement>

# Requirements

- All necessary files for the [task](#task) were preloaded to [files](#files). Reading other files is FORBIDDEN.
- Using tools or shell commands for discovery or information gathering (e.g., grep, glob, ls, git, etc.) is FORBIDDEN.

# Task

Find correct replacement text for the <missing_text> symbol.
````

</details>

### 📄 Commit Messages

_Get change summaries adhering to your preferred style._

<details>
<summary><strong>WEB/API</strong></summary>

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

<details>
<summary><strong>CLI</strong></summary>

```
# Files

[SELECTED FILES WHEN EDITS WERE ACCEPTED]

# Changes

[STAGED CHANGES]

# Output formatting

Your response must begin with "**Commit message:**", then proceed with the message. Example:

**Commit message:** Bump version to 1.0.1

# Requirements

- All project's files were preloaded to [files](#files). You must work strictly within the provided context.
- Calling tools, including shell commands (e.g. grep, glob, ls, git, etc.) is FORBIDDEN.

# Task

Write a brief and precise summary for the changes, limited to a single sentence. Because the summary will be used for a commit message, don't use any markdown formatting and don't include a trailing dot. Use an imperative tone to ensure clarity and focus on the primary change or purpose.
```

</details>

### 📄 Patch Repair

_Apply malformed edits._

<details>
<summary><strong>WEB/API</strong></summary>

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

<details>
<summary><strong>CLI</strong></summary>

```
# File: `[FILE PATH]`

[ORIGINAL FILE CONTENT]

[MALFORMED EDITS]

# Output formatting

Your response must begin with a markdown heading identifying the file, followed by a markdown code block containing the updated file. The heading must be: "### Patch repair: `path/to/file.ext`". Example:

[EXAMPLE]

# Requirements

- Calling tools, including shell commands (e.g. grep, glob, ls, git, etc.) is FORBIDDEN.

# Task

Apply the attached changes to the file without explanations or any other text.
```

</details>

### 📄 Voice Input

_Transcribe speech-to-text with file awareness._

<details>
<summary><strong>API</strong></summary>

```
# Files

[FILES SEEN DURING RECORDING]

# Task

Transcribe using clean verbatim. Remove filler words (such as 'um,' 'uh,' 'like'), false starts, and stutters. Preserve the speaker's exact words, slang, and sentence structure, but use natural punctuation and sentence breaks to ensure readability.

# Output formatting

Respond with the audio transcription or the word INAUDIBLE, without explanations or any other text.
```

</details>

<details>
<summary><strong>CLI</strong></summary>

```
# Files

[FILES SEEN DURING RECORDING]

# Task

Transcribe using clean verbatim. Remove filler words (such as 'um,' 'uh,' 'like'), false starts, and stutters. Preserve the speaker's exact words, slang, and sentence structure, but use natural punctuation and sentence breaks to ensure readability.

Audio file: `[AUDIO_FILE_PATH]`

# Output formatting

Respond with the audio transcription or the word INAUDIBLE, without explanations or any other text.

# Requirements

- All necessary files for the [task](#task) were preloaded to [files](#files). Reading any other files is FORBIDDEN.
- Calling tools, including shell commands (e.g. grep, glob, ls, git, etc.) is FORBIDDEN.
- Exception: If [task](#task) includes *.wav audio file paths, read them using the appropriate tool.
```

</details>

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

- [Node.js](https://nodejs.org/) (22.x recommended)
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
