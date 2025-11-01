# Code Web Chat

<a href="https://marketplace.visualstudio.com/items?itemName=robertpiosik.gemini-coder" target="_blank"><img src="https://img.shields.io/badge/Install-VS_Code_Marketplace-blue" alt="Get from Visual Studio Code Marketplace" /></a> <a href="https://open-vsx.org/extension/robertpiosik/gemini-coder" target="_blank"><img src="https://img.shields.io/badge/Install-Open_VSX_Registry-a60ee5" alt="Get from Open VSX Registry" /></a> <a href="https://github.com/robertpiosik/CodeWebChat/blob/dev/LICENSE" target="_blank"><img src="https://img.shields.io/badge/License-GPL--3.0-green.svg" alt="GPL-3.0 license" /></a>

Blazing fast AI pair programming for production-grade code. Select context as you go for pro accuracy and game-changing speed.

Works with **VS Code**, and forks like **Cursor**, **Windsurf**, **VSCodium**, etc.

✅ **Send prompts everywhere**

- Chatbots—_ChatGPT, Claude, Gemini, AI Studio, Qwen, etc._
- Model providers—_Gemini API, OpenRouter, local Ollama, etc._

✅ **Apply responses**—multi-file changes integration with easy rollback \
✅ **Fully featured**—code completions, commit messages, checkpoints... \
❤️ **Free and open-source**—released under the GPL-3.0 license \
🔒️ **Total privacy**—operates 100% on your local machine

<p>
<img src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/packages/shared/src/media/demo.gif" alt="Walkthrough" />
</p>

## Introduction

👨‍⚖️ **Respects to chatbots' Terms of Use**

Code Web Chat helps you simplify use of coding web tools like ChatGPT's canvas. The idea to initialize chats is borrowed from [Firefox](https://support.mozilla.org/en-US/kb/ai-chatbot) (thank you!) and because there is no further automation once the prompt is sent, by using CWC you're not violating their Terms of Use. Contributors should not submit pull requests implementing further chat automations of any kind, as these will be kindly rejected.

🧑‍💻 **Guide the model with context**

Large language models (LLMs) are trained on vast datasets targeting many use cases. For code generation, a model's training involves analyzing millions of simulated problem-solving flows, such as arriving at the accepted answer from a given StackOverflow question. For the purpose of agentic coding, models are trained on an additional layer of data that simulates gathering context and planning its next steps.

Because the model is only as smart as examples it has seen in its pre-training stage, the possible coverage of real-world problems when approached at a high level is fundamentally limited.

Therefore, CWC is designed to align with LLMs' true capabilities—that is, code generation in a controlled signal-to-noise ratio environment. Controlled by you, the engineer.

🙋 **Meet the non-agentic workflow**

Select folders and files for context, enter instructions, and send message via...

- new chat—to continue in the connected browser
- API call—to use a model provider of choice

Constructed message consists of the user's prompt, edit format instructions, and the selected context, as shown in the example:

```
Implement a subtract function.
<system>
Whenever proposing a new or updated file use the Markdown Code Block syntax. Each code block should be a diff patch. Don't use XML for files.
</system>
<files>
<file path="src/calculator.ts">
<![CDATA[
export const addNumbers = (a: number, b: number) => a + b;
]]>
</file>
</files>
Implement a subtract function.
<system>
Whenever proposing a new or updated file use the Markdown Code Block syntax. Each code block should be a diff patch. Don't use XML for files.
</system>
```

> [!NOTE]
> The prompt and edit format instructions are repeated after the context [for better accuracy](https://cookbook.openai.com/examples/gpt4-1_prompting_guide#:~:text=If%20you%20have%20long%20context%20in%20your%20prompt%2C%20ideally%20place%20your%20instructions%20at%20both%20the%20beginning%20and%20end%20of%20the%20provided%20context%2C%20as%20we%20found%20this%20to%20perform%20better%20than%20only%20above%20or%20below.).

Once the response is generated, CWC's built-in parser extracts code blocks with suggested edits for one-click multi-file changes integration.

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
- Minimax
- Mistral
- Open WebUI
- OpenRouter
- Perplexity
- Qwen
- Together
- Yuanbao
- Z

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

## Enterprise security

**Code Web Chat operates exclusively on your machine.** Your code and instructions are sent directly to chatbots via editor-browser communication channel run on local Websockets. For API tools, model providers are called directly.

## Community

If you have a question, or want to help others, you're always welcome in our community.

- [Discord server](https://discord.gg/KJySXsrSX5)
- [GitHub Discussions](https://github.com/robertpiosik/CodeWebChat/discussions)

## Donations

If you enjoy using Code Web Chat, [buying a $3 coffee](https://buymeacoffee.com/robertpiosik) is a great way to show your support for the project.

**BTC:** bc1qfzajl0fc4347knr6n5hhuk52ufr4sau04su5te

**ETH:** 0x532eA8CA70aBfbA6bfE35e6B3b7b301b175Cf86D

**XMR:** 84whVjApZJtSeRb2eEbZ1pJ7yuBoGoWHGA4JuiFvdXVBXnaRYyQ3S4kTEuzgKjpxyr3nxn1XHt9yWTRqZ3XGfY35L4yDm6R

## Contributing

All contributions are welcome. Feel free to submit pull requests, feature requests and bug reports.

<hr />

Copyright © 2025 [Robert Piosik](https://x.com/robertpiosik) \
E-mail: robertpiosik@gmail.com \
Telegram: @robertpiosik
