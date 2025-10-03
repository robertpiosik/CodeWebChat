# Code Web Chat

<a href="https://marketplace.visualstudio.com/items?itemName=robertpiosik.gemini-coder" target="_blank"><img src="https://img.shields.io/badge/Install-VS_Code_Marketplace-blue" alt="Get from Visual Studio Code Marketplace" /></a> <a href="https://open-vsx.org/extension/robertpiosik/gemini-coder" target="_blank"><img src="https://img.shields.io/badge/Install-Open_VSX_Registry-a60ee5" alt="Get from Open VSX Registry" /></a> <a href="https://github.com/robertpiosik/CodeWebChat/blob/dev/LICENSE" target="_blank"><img src="https://img.shields.io/badge/License-GPL--3.0-green.svg" alt="License: GPL-3.0" /></a>

Code Web Chat is a community-driven, free and open-source (FOSS) AI coding tool that initializes popular chatbots and applies chat responses.

✅ **Initializes popular chatbots**—ChatGPT, Claude, Gemini, AI Studio, DeepSeek, and 10+ more \
✅ **Applies chat responses**—seamless handling of whole, truncated and diff code blocks

Available in <a href="https://marketplace.visualstudio.com/items?itemName=robertpiosik.gemini-coder" target="_blank">VS Code</a>, <a href="https://open-vsx.org/extension/robertpiosik/gemini-coder" target="_blank">Cursor, and other forks</a>.

<p>
<img src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/packages/shared/src/media/demo.gif" alt="Walkthrough" />
</p>

⭐️ **Guiding principles**

- Privacy first—operate locally, don't collect any data
- Initialize chatbots—don't scrape responses
- Free forever—community effort

⭐️ **The workflow**

Select folders and files for context, enter prompt, pick edit format and send message via...

- new chat—to continue in the web browser
- API call—to stay in the editor

Prepared by the extension message consists of your prompt, edit format instructions, and the selected context, like shown in the example below:

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

> <small>The prompt and edit format instructions are repeated after the context [for better accuracy](https://cookbook.openai.com/examples/gpt4-1_prompting_guide#:~:text=If%20you%20have%20long%20context%20in%20your%20prompt%2C%20ideally%20place%20your%20instructions%20at%20both%20the%20beginning%20and%20end%20of%20the%20provided%20context%2C%20as%20we%20found%20this%20to%20perform%20better%20than%20only%20above%20or%20below.).</small>

In seconds, as the response is ready it interactively applied in a fully revertible way.

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Chatbot initialization</span>

Install the Connector browser extension and never copy & paste again.

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

Interactions of submitting the message in the chatbot interface are handled by the [content script](https://github.com/robertpiosik/CodeWebChat/blob/dev/packages/browser/src/content-scripts/send-prompt-content-script/send-prompt-content-script.ts).

> <small>**Legal disclaimer:** The placed _Apply response with CWC_ button is not a means of automatic output extraction, it's an alias for the original copy to clipboard button present under all responses. Changes integration process reads clipboard text.</small>

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">API Tools</span>

Anything CWC can do in the connected browser, it can do calling a model provider of choice directly in the editor. Get started with a generous free tier from [Google](https://aistudio.google.com/api-keys) or [Cerebras](https://cloud.cerebras.ai/).

**🛠️ Edit Context** \
Modify, create or delete files based on natural language instructions.

**🛠️ Code Completions** \
Get accurate code-at-cursor from state-of-the-art reasoning models.

**🛠️ Intelligent Update** \
Integrate truncated code blocks and fix malformed diffs.

**🛠️ Commit Messages** \
Generate meaningful summaries of changes adhering to your style.

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Commands</span>

### Handling chat responses

- `Code Web Chat: Apply Chat Response` - Integrate with the codebase a copied to clipboard overall chat response or a single code block.
- `Code Web Chat: Refactor Current File` - Use Intelligent Update API tool for the active editor, without context. Accepts clipboard text or instructions.
- `Code Web Chat: Undo Last Changes` - Revert applied AI-suggested edits.

### Code completions

- `Code Web Chat: Code Completion` - Get code-at-cursor using API tool.
- `Code Web Chat: Code Completion using...` - ...with configuration selection.
- `Code Web Chat: Code Completion with Instructions` - ...with instructions.
- `Code Web Chat: Code Completion with Instructions using...` - ...with instructions and configuration selection.

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Enterprise security</span>

**Code Web Chat operates exclusively on your machine.** All your code and instructions are sent directly to chatbots via editor-browser communication channel run on local Websockets. Model providers for API tools are called directly.

The tool **does not** collect telemetry.

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Community</span>

If you have a question, or want to help others, you're always welcome in our community.

- [Discord](https://discord.gg/KJySXsrSX5)
- [Reddit](https://www.reddit.com/r/CodeWebChat)
- [Discussions](https://github.com/robertpiosik/CodeWebChat/discussions)

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Donations</span>

If you enjoy using Code Web Chat, [buying a $3 coffee](https://buymeacoffee.com/robertpiosik) is a great way to show your support for the project.

**BTC:** bc1qfzajl0fc4347knr6n5hhuk52ufr4sau04su5te

**ETH:** 0x532eA8CA70aBfbA6bfE35e6B3b7b301b175Cf86D

**XMR:** 84whVjApZJtSeRb2eEbZ1pJ7yuBoGoWHGA4JuiFvdXVBXnaRYyQ3S4kTEuzgKjpxyr3nxn1XHt9yWTRqZ3XGfY35L4yDm6R

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Contributing</span>

All contributions are welcome. Feel free to submit pull requests, feature requests and bug reports.

<hr />

Copyright © 2025 [Robert Piosik](https://x.com/robertpiosik) \
E-mail: robertpiosik@gmail.com \
Telegram: @robertpiosik
