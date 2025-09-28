# Code Web Chat

<a href="https://marketplace.visualstudio.com/items?itemName=robertpiosik.gemini-coder" target="_blank"><img src="https://img.shields.io/badge/Install-VS_Code_Marketplace-blue" alt="Get from Visual Studio Code Marketplace" /></a> <a href="https://open-vsx.org/extension/robertpiosik/gemini-coder" target="_blank"><img src="https://img.shields.io/badge/Install-Open_VSX_Registry-a60ee5" alt="Get from Open VSX Registry" /></a> <a href="https://github.com/robertpiosik/CodeWebChat/blob/dev/LICENSE" target="_blank"><img src="https://img.shields.io/badge/License-GPL--3.0-green.svg" alt="License: GPL-3.0" /></a>

Code Web Chat is a community-driven, free and open-source (FOSS) AI coding tool that initializes your favorite chatbot with code and instructions, hands-free!

✅ **All popular chatbots**—auto-run ChatGPT, Claude, Qwen, DeepSeek, among others \
✅ **Apply chat responses**—integrate changes in whole, truncated or diff edit format \
✅ **Cost-efficient AI coding**—use generous free tiers and subscription-based billing \
✅ **Zero tool calling**—manually pick context for unmatched accuracy and speed

Available in <a href="https://marketplace.visualstudio.com/items?itemName=robertpiosik.gemini-coder" target="_blank">VS Code</a>, <a href="https://open-vsx.org/extension/robertpiosik/gemini-coder" target="_blank">Cursor, and other forks</a>.

<p>
<img src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/packages/shared/src/media/demo.gif" alt="Walkthrough" />
</p>

⭐️ **Guiding principles**

- Privacy first—operate locally, don't collect any data
- Initialize chatbots—don't scrape responses
- Free forever—community effort

⭐️ **CWC is for you if you're**

- a professional working on a large codebase
- a student or hobbyist on a budget

⭐️ **The workflow**

Select folders and files for context, type instructions, and pick your favorite chatbot—to continue in the browser, or call a model provider of choice—to stay in the editor.

Once the response is ready, suggested multi-file changes can be integrated with the codebase after you review them in a transparent and safe way.

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Chatbot initialization</span>

Install our Connector browser extension and never copy & paste again.

- [Chrome Web Store](https://chromewebstore.google.com/detail/code-web-chat-connector/ljookipcanaglfaocjbgdicfbdhhjffp)
- [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/code-web-chat-connector/)

It uses a simple [content script](https://github.com/robertpiosik/CodeWebChat/blob/dev/packages/browser/src/content-scripts/send-prompt-content-script/send-prompt-content-script.ts) to insert prepared prompt, change model, etc., on your behalf, but is not required for CWC to function.

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

> <small>**Legal disclaimer:** The injected, yellow [Apply response with CWC] button is not a means of automatic output extraction, it's an alias for the original _copy to clipboard_ button—changes integration process uses clipboard-stored chat response text.</small>

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">API Tools</span>

CWC is not limited to chatbot initializations. To use built-in API tools, bring your own key (BYOK) for any OpenAI-API compatible model provider.

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
