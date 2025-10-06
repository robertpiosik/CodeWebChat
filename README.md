# Code Web Chat

<a href="https://marketplace.visualstudio.com/items?itemName=robertpiosik.gemini-coder" target="_blank"><img src="https://img.shields.io/badge/Install-VS_Code_Marketplace-blue" alt="Get from Visual Studio Code Marketplace" /></a> <a href="https://open-vsx.org/extension/robertpiosik/gemini-coder" target="_blank"><img src="https://img.shields.io/badge/Install-Open_VSX_Registry-a60ee5" alt="Get from Open VSX Registry" /></a> <a href="https://github.com/robertpiosik/CodeWebChat/blob/dev/LICENSE" target="_blank"><img src="https://img.shields.io/badge/License-GPL--3.0-green.svg" alt="License: GPL-3.0" /></a>

Fast and privacy-first AI coding for <a href="https://marketplace.visualstudio.com/items?itemName=robertpiosik.gemini-coder" target="_blank">VS Code</a>, <a href="https://open-vsx.org/extension/robertpiosik/gemini-coder" target="_blank">Cursor, and other forks</a>.

✅ **Connects with free chatbots**—ChatGPT, Claude, Gemini, DeepSeek, and 10+ more \
✅ **Applies chat responses**—multi-file edits in a safe, fully revertible way \
🫰 **Saves money and time**—zero context overhead or subsequent calls \
🫶 **Free and open-source**—released under the GPL-3.0 license

<p>
<img src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/packages/shared/src/media/demo.gif" alt="Walkthrough" />
</p>

✍️ **Guiding principles**

- Start chats but don't scrape responses
- Don't collect telemetry
- Operate 100% locally
- Stay free forever

💅 **The workflow**

Select relevant folders and files for context, enter prompt, pick edit format and send message via...

- new chat—to continue in the connected browser
- API call—to stay within the editor

Constructed message consists of your prompt, edit format instructions, and the selected context, as shown in the example:

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

Once the response is generated, markdown code blocks with suggested edits in a _whole_, _truncated_ or _diff_ edit format can be applied in a safe, fully revertible way.

> [!TIP]
> Each edit format has pros and cons. With the most capable models **(Claude Sonnet, Gemini Pro, GPT-5, etc.)**, it's best to request _diffs_, which are demanding for correct formatting but are fast to generate. With weaker models **(Gemini Flash, GPT-5-mini, etc.)**, stick to _whole_ edit format. Use _truncated_ when a model have difficulties with _diffs_ and you don't want to pay the price of _whole_ generations. _Truncated_ code block needs API call to apply, though weaker models are sufficient.

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Chatbot initialization</span>

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

> [!TIP]
> With the browser extension you can include markdown-parsed websites in context! Just click the extension's icon in the browser's toolbar and click _Enable for context_. The website will appear in the context panel immediately, ready for selection like any other folder or file in the workspace.

> [!NOTE]
> All web interactions of submitting the message are handled by the [content script](https://github.com/robertpiosik/CodeWebChat/blob/dev/packages/browser/src/content-scripts/send-prompt-content-script/send-prompt-content-script.ts).

> [!IMPORTANT]
> The tool does not require the browser extension to operate—chats can be initialized and responses applied with manual copy & paste. The placed _Apply response with CWC_ button is not a means of automatic output extraction, it's an alias for the original _copy to clipboard_ button present under responses; these are applied based on the copied markdown text.

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">API Tools</span>

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

**The tool operates exclusively on your machine.** All your code and instructions are sent directly to chatbots via editor-browser communication channel run on local Websockets. Model providers for API tools are called directly.

> [!IMPORTANT]
> Code Web Chat **does not** collect telemetry.

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
