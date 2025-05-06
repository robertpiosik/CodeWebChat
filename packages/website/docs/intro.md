---
sidebar_position: 1
hide_table_of_contents: true
---

# Introduction

Non-agentic 100% free & open source coding tool for AI-assisted programming.

All manually selected folders and files are fully attached with chats, code completions and file refactorings. Gemini Coder initializes AI Studio, Gemini and 10+ other popular chatbots, hands-free. Whenever you're happy with a chat response, integrate it with the codebase with a single click.

Gemini Coder is for you if:

- you're an experienced developer working on a large codebase
- coding agents failed you too many times
- student or hobbyist on a budget

Not affiliated with Google.

<br/>

<img src="https://github.com/robertpiosik/gemini-coder/raw/HEAD/packages/shared/src/media/walkthrough.gif" alt="Walkthrough" />

<br/>

## Overview

- Intuitive context selection
- Web chat initialization
- Chat response integration
- Code completions with any model
- Effective file refactoring
- Not limited to Gemini
- Any website in context
- Commit message generation
- Totally free
- Does not track usage
- Lightweight ~1.3MB

## You own the context

Other tools try to "guess" what pieces of the codebase matter for the given task, often struggling to get it right. They workaround this problem by overloading context with excessive information, hurting model's performance and your wallet.

Gemini Coder works differently:

- **You select** which folders and files are relevant to the task
- **You decide** what examples of coding conventions will work best
- **You know** exactly how much tokens you have in the context

The result? Unmatched in cost, speed and accuracy AI assistance.

> Too many tokens fighting for attention may _decrease_ performance due to being too "distracting", diffusing attention too broadly and decreasing a signal to noise ratio in the features. ~Andrej Karpathy

## Web chats

As everyone have their own favourite web chat interface, each with unique features and feel not feasible to integrate within the editor, Gemini Coder have you covered by initializing Gemini, AI Studio and many other popular chatbots with your context, instructions and settings, hands-free!

**You can start chats in one of two modes:**

- Ask anything
- Ask for code completion

**_Apply Chat Response_** is a smart tool that automatically integrates chat responses with the codebase, either replacing original files ("whole" code blocks) or refactoring with API (truncated code blocks).

**Supported chatbots:**

- AI Studio
- Gemini
- Open WebUI (self-hosted)

**Also works with:** _(Alphabetically)_

- ChatGPT
- Claude
- DeepSeek
- Grok
- HuggingChat
- Mistral
- OpenRouter Chat
- Qwen

The Connector extension is vailable in [Chrome Web Store](https://chromewebstore.google.com/detail/gemini-coder-connector/ljookipcanaglfaocjbgdicfbdhhjffp) and [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/gemini-coder-connector/).

> <small>**Legal Disclaimer:** After chat initialization, the extension does not read the incoming message. The injected _Apply response_ button is not a means of automatic output extraction, it's an alias for the original _copy to clipboard_ button.</small>

## 🧰 Tools

Support your day-to-day work with all must-have AI features.

**Bring your own API keys for:**

- Gemini API
- OpenRouter

<small>
API keys are stored locally on your computer and all requests are sent directly to the provider.
</small>

#### 🛠️ Code completions

Use any model for accurate code completions. The tool attaches selected context in each request.

#### 🛠️ File refactoring

Modify the active file based on natural language instructions. The tool attaches selected context in each request.

#### 🛠️ Apply chat response

Automatically integrate chat responses with your codebase. The tool detects whether the clipboard contains complete files (replaces them directly), diffs or truncated files with ellipsis commments, e.g. "// ..." (applies them intelligently).

#### 🛠️ Commit messages

Generate meaningful commit messages based on contents of affected files and diffs of changes.

## Quick start for chat

1. Open the new Gemini Coder view from the activity bar (sparkles icon).
2. Select folders and files to include in the context.
3. Enter instructions and copy generated prompt.
4. (optional) Install [browser integration](https://gemini-coder.netlify.app/docs/installation/web-browser-integration) for hands-free initializations.

## Quick start for code completions

1. Open the new Gemini Coder view from the activity bar (sparkles icon).
2. Select folders and files to include in the context.
3. Place caret where you want code completion to appear.
4. Use Command Palette (Ctrl/Cmd + Shift + P) and type "Code Completion".
5. Bind the command to a keyboard shortcut by opening Keyboard Shortcuts (Ctrl/Cmd+K Ctrl/Cmd+S), searching for `Gemini Coder: Code Completion`, clicking the + icon, and pressing your preferred key combination (e.g. Ctrl/Cmd+I).
