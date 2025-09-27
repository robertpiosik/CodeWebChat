# Code Web Chat

<a href="https://marketplace.visualstudio.com/items?itemName=robertpiosik.gemini-coder" target="_blank"><img src="https://img.shields.io/badge/Install-VS_Code_Marketplace-blue" alt="Get from Visual Studio Code Marketplace" /></a> <a href="https://open-vsx.org/extension/robertpiosik/gemini-coder" target="_blank"><img src="https://img.shields.io/badge/Install-Open_VSX_Registry-a60ee5" alt="Get from Open VSX Registry" /></a> <a href="https://github.com/robertpiosik/CodeWebChat/blob/dev/LICENSE" target="_blank"><img src="https://img.shields.io/badge/License-GPL--3.0-green.svg" alt="License: GPL-3.0" /></a>

Code Web Chat is a versatile, free and open-source (FOSS) AI coding tool that connects VS Code with ChatGPT, AI Studio, DeepSeek, and 10+ other free chatbots.

✅ **Save money**—use generous free tiers and subscription-based billing \
✅ **Save time**—finish tasks in seconds, not minutes

Available in <a href="https://marketplace.visualstudio.com/items?itemName=robertpiosik.gemini-coder" target="_blank">VS Code</a>, <a href="https://open-vsx.org/extension/robertpiosik/gemini-coder" target="_blank">Cursor, and other forks</a>.

<p>
<img src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/packages/shared/src/media/demo.gif" alt="Walkthrough" />
</p>

**The workflow**

Select folders and files for context, type instructions, and pick your favorite chatbot—to continue in the browser, or call a model provider of choice—to stay in the editor.

Once the response is ready, multi-file suggested changes can be applied to the codebase after you review them in a transparent and safe way.

**Guiding principles**

- Initialize chatbots—don't scrape responses
- Privacy first—don't collect any usage data
- Free forever—open-source community effort

**CWC is for you if you're**

- a professional working on a large codebase
- a student or hobbyist on a budget

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Chatbot initialization</span>

Install the Connector browser extension and never copy&paste again.

- [Chrome Web Store](https://chromewebstore.google.com/detail/code-web-chat-connector/ljookipcanaglfaocjbgdicfbdhhjffp)
- [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/code-web-chat-connector/)

**Supported chatbots:**

- AI Studio
- ChatGPT
- Claude
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
- Z.AI

> <small>**Legal Disclaimer:** The extension does only basic web interactions to start a new conversation. The injected _Apply response with CWC_ button is not a means of automatic output extraction, it's an alias for the original _copy to clipboard_ button.</small>

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">API Tools</span>

CWC is not limited to chatbot initializations. To use built-in API tools, bring your own keys (BYOK) for any OpenAI-API compatible model provider.

**🛠️ Edit Context** \
Modify files based on natural language instructions.

**🛠️ Code Completions** \
Get accurate code-at-cursor from state-of-the-art reasoning models.

**🛠️ Intelligent Update** \
Integrate truncated code blocks and fix malformed diffs.

**🛠️ Commit Messages** \
Generate meaningful summaries of changes adhering to your style.

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Commands</span>

### Handling chat responses

- `Code Web Chat: Apply Chat Response` - Integrate with the codebase a copied to clipboard overall chat response or a single code block.
- `Code Web Chat: Apply Clipboard Content to Active Editor` - Serves as a flexible fallback for applying AI-generated edits, e.g. broken diffs.
- `Code Web Chat: Undo Last Changes` - Revert applied AI-suggested edits.

### Code completions

- `Code Web Chat: Code Completion` - Get code-at-cursor using API tool.
- `Code Web Chat: Code Completion using...` - ...with configuration selection.
- `Code Web Chat: Code Completion with Instructions` - ...with instructions.
- `Code Web Chat: Code Completion with Instructions using...` - ...with instructions and configuration selection.

### Version control

- `Code Web Chat: Commit Changes` - Automatically generate a commit message for staged changes and commit them.

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Enterprise security</span>

**Code Web Chat operates exclusively on your machine.** All your code and instructions are sent directly to chatbots via editor-browser communication channel run on local Websockets. Model providers for API tools are called directly.

The tool **does not** collect telemetry.

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Community</span>

If you have a question about CWC, or want to help others, you're always welcome to join the conversation:

- [GitHub Discussions](https://github.com/robertpiosik/CodeWebChat/discussions)
- [Discord](https://discord.gg/KJySXsrSX5)
- [Reddit](https://www.reddit.com/r/CodeWebChat)

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Donations</span>

[Buy me a coffee](https://buymeacoffee.com/robertpiosik)

**BTC:** bc1qfzajl0fc4347knr6n5hhuk52ufr4sau04su5te

**ETH:** 0x532eA8CA70aBfbA6bfE35e6B3b7b301b175Cf86D

**XMR:** 84whVjApZJtSeRb2eEbZ1pJ7yuBoGoWHGA4JuiFvdXVBXnaRYyQ3S4kTEuzgKjpxyr3nxn1XHt9yWTRqZ3XGfY35L4yDm6R

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Contributing</span>

All contributions are welcome. Feel free to submit pull requests, feature requests and bug reports.

<hr />

Copyright © 2025 [Robert Piosik](https://x.com/robertpiosik) \
E-mail: robertpiosik@gmail.com \
Telegram: @robertpiosik
