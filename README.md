# Code Web Chat

<a href="https://marketplace.visualstudio.com/items?itemName=robertpiosik.gemini-coder" target="_blank"><img src="https://img.shields.io/badge/Install-VS_Code_Marketplace-blue" alt="Get from Visual Studio Code Marketplace" /></a> <a href="https://open-vsx.org/extension/robertpiosik/gemini-coder" target="_blank"><img src="https://img.shields.io/badge/Install-Open_VSX_Registry-a60ee5" alt="Get from Open VSX Registry" /></a> <a href="https://github.com/robertpiosik/CodeWebChat/blob/dev/LICENSE" target="_blank"><img src="https://img.shields.io/badge/License-GPL--3.0-green.svg" alt="License: GPL-3.0" /></a>

No-cost AI coding in free chatbots for <a href="https://marketplace.visualstudio.com/items?itemName=robertpiosik.gemini-coder" target="_blank">VS Code</a>, <a href="https://open-vsx.org/extension/robertpiosik/gemini-coder" target="_blank">Cursor, and others</a>.

✅ **Initializes chats**—ChatGPT, Claude, Gemini, AI Studio, Qwen, DeepSeek, and more \
✅ **Applies responses**—one-click multi-file changes integration \
🫶 **Open-source**—released under the GPL-3.0 license

<p>
<img src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/packages/shared/src/media/demo.gif" alt="Walkthrough" />
</p>

✍️ **Guiding principles**

- Don't scrape chat responses
- Operate 100% locally
- Stay free forever

🤌 **Why non-agentic?**

Large language models (LLMs) are trained on vast datasets targeting many use cases. For code generation, a model's training involves analyzing millions of simulated problem-solving flows, such as arriving at an accepted answer from a StackOverflow question. For the purpose of agentic coding, models are trained on an additional layer of data that simulates gathering context and planning next steps.

Because the model is only as smart as examples it has seen in its pre-training, the possible coverage of real-world coding scenarios when approached at a high level is fundamentally limited.

Therefore, CWC is designed in a way that aligns with LLMs' true capabilities—that is, code generation in a controlled signal-to-noise ratio environment.

💅 **The workflow**

Select folders and files for context, enter prompt, pick edit format and send message via...

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

Once the response is generated, a built-in parser extracts code blocks with suggested edits for one-click multi-file changes integration.

## Chatbot initialization

Install the [open-source](https://github.com/robertpiosik/CodeWebChat/blob/dev/packages/browser) Connector in your browser and never copy & paste again.

- [Chrome Web Store](https://chromewebstore.google.com/detail/code-web-chat-connector/ljookipcanaglfaocjbgdicfbdhhjffp)
- [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/code-web-chat-connector/)

**Supported chatbots (A-Z)**

- AI Studio
- ChatGPT
- Claude
- Copilot
- DeepSeek
- Doubao
- Gemini
- GitHub Copilot
- Grok
- Kimi
- Mistral
- Open WebUI
- OpenRouter Chat
- Perplexity
- Qwen
- Together
- Yuanbao
- Z

> [!NOTE]
> All web page interactions of submitting the message are handled by the [content script](https://github.com/robertpiosik/CodeWebChat/blob/dev/packages/browser/src/content-scripts/send-prompt-content-script/send-prompt-content-script.ts).

> [!TIP]
> With the browser extension you can include markdown-parsed websites in context! Go to target website, click the extension's icon in the browser's toolbar and click _Enable for context_. The website will appear in the context panel immediately, ready for selection like any other folder or file in the workspace.

> [!IMPORTANT]
> Legal disclaimer: The tool does not require the browser extension to operate—chats can be initialized and responses applied with manual copy & paste as well. The placed _Apply response_ button is not a means of automatic output extraction, it's an alias for the original _copy to clipboard_ button.

## API Tools

Anything CWC can do in chatbots, it can do calling model providers directly from the editor.

> [!TIP]
> Get started with a generous free tier getting an API key from [Google](https://aistudio.google.com/api-keys) or [Cerebras](https://cloud.cerebras.ai/).

**🛠️ Edit Context** \
Modify, create or delete files based on natural language instructions.

**🛠️ Code Completions** \
Get accurate code-at-cursor from state-of-the-art reasoning models.

**🛠️ Intelligent Update** \
Integrate truncated code blocks and fix malformed diffs.

**🛠️ Commit Messages** \
Generate meaningful summaries of changes adhering to your style.

## Commands

### Handling chat responses

- `Code Web Chat: Apply Chat Response` - Integrate with the codebase a copied to clipboard overall chat response or a single code block.
- `Code Web Chat: Apply Code Block to Active Editor` - Use Intelligent Update API tool on the active editor.
- `Code Web Chat: Undo Last Changes` - Revert applied AI-suggested edits.

### Code completions

- `Code Web Chat: Code Completion` - Get code-at-cursor using API tool.
- `Code Web Chat: Code Completion using...` - ...with configuration selection.
- `Code Web Chat: Code Completion with Instructions` - ...with instructions.
- `Code Web Chat: Code Completion with Instructions using...` - ...with instructions and configuration selection.

## Enterprise security

**Code Web Chat operates exclusively on your machine and does not collect telemetry.** Your code and instructions are sent directly to chatbots via editor-browser communication channel run on local Websockets. For API tools, model providers are called directly.

## Community

If you have a question, or want to help others, you're always welcome in our community.

- [Discord](https://discord.gg/KJySXsrSX5)
- [Reddit](https://www.reddit.com/r/CodeWebChat)
- [Discussions](https://github.com/robertpiosik/CodeWebChat/discussions)

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
