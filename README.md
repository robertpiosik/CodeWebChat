# Code Web Chat

<a href="https://marketplace.visualstudio.com/items?itemName=robertpiosik.gemini-coder" target="_blank"><img src="https://img.shields.io/badge/Install-VS_Code_Marketplace-blue" alt="Get from Visual Studio Code Marketplace" /></a> <a href="https://open-vsx.org/extension/robertpiosik/gemini-coder" target="_blank"><img src="https://img.shields.io/badge/Install-Open_VSX_Registry-a60ee5" alt="Get from Open VSX Registry" /></a> <a href="https://github.com/robertpiosik/CodeWebChat/blob/dev/LICENSE" target="_blank"><img src="https://img.shields.io/badge/License-GPL--3.0-green.svg" alt="GPL-3.0 license" /></a>

Superfast AI coding for VS Code, Cursor, and others. Free, open-source, and privacy-first.

✅ **Send messages anywhere**

- Chatbots—_ChatGPT, Claude, Gemini, AI Studio, Qwen, etc._
- Model providers—_Gemini API, OpenRouter, local Ollama, etc._

✅ **Apply responses**—changes integration in whole, truncated and diff edit formats \
✅ **Fully featured**—code completions, commit messages, checkpoints, and more

<p>
<img src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/packages/shared/src/media/screenshot.png" alt="Screenshot" />
</p>

## Introduction

👨‍⚖️ **Chatbot initializations with respect to TOS**

CWC lets you use your favorite chatbot's projects/spaces feature for coding. The idea of submitting messages was inspired by [Firefox](https://support.mozilla.org/en-US/kb/ai-chatbot) (thank you!) and is supported by many chatbots out of the box via URL search param `?q=` (therefore this is standard practice). Because chatbot's Terms of Service prohibit automated output extraction, the tool never does that—a click on _APPLY RESPONSE_ button is required—it's an alias for the default Copy button with a signal to CWC to read the clipboard.

🧐 **The limitations of LLMs**

Large language models (LLMs) are trained on vast datasets targeting many use cases. For code generation, a model's training involves analyzing millions of simulated problem-solving flows, such as arriving at the accepted answer from a given StackOverflow question. For the purpose of agentic coding, models are trained on an additional layer of data that simulates gathering context and planning its next steps.

Because the model is only as smart as examples it has seen in its pre-training stage, the possible coverage of real-world problems when approached at a high level is fundamentally limited.

Therefore, CWC is designed to align with LLMs' true capabilities—that is, code generation in a controlled signal-to-noise ratio environment. Controlled by you, the engineer.

🧠 **Guide the model with context**

Unlike coding agents that require detailed instructions to understand your intent and locate relevant files, with CWC you provide fine-grained context up front, allowing simple, even vague instructions.

> [!TIP]
> LLMs are pattern matchers—they love examples! Include some you believe will help the model understand the goal better.

Meet the CWC's non-agentic workflow—select folders and files, enter instructions, and send message in a new web chat or with an API provider of choice.

Constructed message is simple and focuses the model's whole attention on the task:

```
Implement a subtract function.
<system>
Whenever showing a new, updated, renamed or deleted file, provide brief explanation, then...
</system>
<files>
<file path="src/calculator.ts">
<![CDATA[
export const addNumbers = (a: number, b: number) => a + b;
]]>
</file>
</files>
<system>
Whenever showing a new, updated, renamed or deleted file, provide brief explanation, then...
</system>
Implement a subtract function.
```

> [!NOTE]
> The prompt and edit format instructions are repeated after the context [for better accuracy](https://cookbook.openai.com/examples/gpt4-1_prompting_guide#:~:text=If%20you%20have%20long%20context%20in%20your%20prompt%2C%20ideally%20place%20your%20instructions%20at%20both%20the%20beginning%20and%20end%20of%20the%20provided%20context%2C%20as%20we%20found%20this%20to%20perform%20better%20than%20only%20above%20or%20below.).

Once the response is generated, sophisticated parser extracts code blocks with suggested edits for one-click multi-file changes integration.

## Chatbot initialization

Install the [open-source](https://github.com/robertpiosik/CodeWebChat/blob/dev/packages/browser) Connector in your browser and never copy & paste again.

- [Chrome Web Store](https://chromewebstore.google.com/detail/code-web-chat-connector/ljookipcanaglfaocjbgdicfbdhhjffp)
- [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/code-web-chat-connector/)

**Supported chatbots**

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
- Perplexity
- Qwen
- Together
- Yuanbao
- Z AI

> [!TIP]
> With the browser extension you can include markdown-parsed websites in context. Go to target website, click the extension's icon in the browser's toolbar and click _Enable for context_.

> [!IMPORTANT]
> The _Apply response_ button placed under responses is not a means of automatic output extraction, it's an alias for the original _copy to clipboard_ button. Review the [content script](https://github.com/robertpiosik/CodeWebChat/blob/dev/packages/browser/src/content-scripts/send-prompt-content-script/send-prompt-content-script.ts) for implementation details.

## API Tools

Anything CWC can do in chatbots, it can do calling model providers directly from the editor.

> [!TIP]
> Get started with generous free tiers from [Google](https://aistudio.google.com/api-keys), [Mistral](https://console.mistral.ai/api-keys) or [Cerebras](https://cloud.cerebras.ai/).

**🛠️ Edit Context** \
Modify, create or delete files based on natural language instructions.

**🛠️ Code Completions** \
Get accurate code-at-cursor from state-of-the-art reasoning models.

**🛠️ Intelligent Update** \
Handle the compact "truncated" edit format and malformed diffs.

**🛠️ Commit Messages** \
Generate meaningful summaries of changes adhering to your style.

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

- `Code Web Chat: Save Context` - Save the currently checked files as a named context for easy reuse.
- `Code Web Chat: Apply Context` - Apply a saved context to either replace or merge with the currently checked files.
- `Code Web Chat: Copy Context` - Copy XML-formatted checked files from the Workspace view to the clipboard.
- `Code Web Chat: Copy Context of Open Editors` - Copy XML-formatted checked files from the Open Editors view to the clipboard.
- `Code Web Chat: Find Paths in Clipboard` - Select files based on paths found in the clipboard text.

## Enterprise security

**Code Web Chat operates exclusively on your machine.** Your code and instructions are sent directly to chatbots via editor-browser communication channel run on local Websockets. For API tools, model providers are called directly.

## Community

If you have a question, or want to help others, you're always welcome in our community.

- [Discord server](https://discord.gg/KJySXsrSX5)
- [GitHub Discussions](https://github.com/robertpiosik/CodeWebChat/discussions)

## Contributing

All contributions are welcome. Feel free to submit pull requests, feature requests and bug reports.

<hr />

Copyright © 2025 [Robert Piosik](https://x.com/robertpiosik) \
E-mail: robertpiosik@gmail.com \
Telegram: @robertpiosik
