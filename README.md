# Code Web Chat

<a href="https://marketplace.visualstudio.com/items?itemName=robertpiosik.gemini-coder" target="_blank"><img src="https://img.shields.io/badge/Install-VS_Code_Marketplace-blue" alt="Get from Visual Studio Code Marketplace" /></a>

100% free and open source VS Code extension for **AI pair programming with free chatbots**.

✅ **Initializes 15+ chatbots hands-free** \
✅ **Integrates chat responses with the codebase** \
✅ **Includes all the essential API tools**

<p>
<img src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/packages/shared/src/media/demo.gif" alt="Walkthrough" />
</p>

**With CWC you can:**

- Granularly select folders and files to copy them as XML-formatted text.
- Type your task, pick edit format (whole/truncated/diff), initialize a chatbot hands-free (or send an API request) and automatically integrate the response with the codebase.
- Get accurate code completions using the selected context with SOTA reasoning models.
- Generate meaningful commit messages by referencing the original state of the modified files.
- Include websites parsed to markdown in context.

**Guiding principles:**

- initialize chatbots—don't scrape responses
- complete privacy—local processing
- lightweight—about 1MB of code

**CWC is for you if:**

- you're an experienced developer working on a large codebase
- you're a student or hobbyist on a budget

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Chatbot initialization</span>

Code with your favorite chatbot without tedious copy-pasting. The Connector extension bridges your editor and the browser through a locally run WebSockets server.

- [Chrome Web Store](https://chromewebstore.google.com/detail/code-web-chat-connector/ljookipcanaglfaocjbgdicfbdhhjffp)
- [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/gemini-coder-connector/)

**Supported chatbots:**

- AI Studio
- ChatGPT
- Claude
- DeepSeek
- Doubao
- Gemini
- Grok
- Mistral
- Open WebUI
- OpenRouter Chat
- Perplexity
- Kimi
- Qwen
- Yuanbao
- Z.AI

> <small>**Legal Disclaimer:** After chat initialization, the extension does not read the incoming message. The injected _Apply response_ button is not a means of automatic output extraction, it's an alias for the original _copy to clipboard_ button.</small>

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">API Tools</span>

**Code Completions** \
Get code at cursor from state-of-the-art reasoning models.

**Edit Context** \
Create and modify files in context based on natural language instructions.

**Intelligent Update** \
Integrate chat/API responses in "truncated" edit format. Fix malformed diffs.

**Commit Messages** \
Generate meaningful commit messages precisely adhering to your preferred style.

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Commands</span>

### Handling AI responses

- `Code Web Chat: Apply Chat Response` - Integrate with the codebase copied overall chat response or a single code block.
- `Code Web Chat: Revert Last Changes` - Revert above command.

### Context

- `Code Web Chat: Copy Context` - Copy selected files and websites to clipboard.
- `Code Web Chat: Apply Context from Clipboard` - Find file paths in the clipboard text.

### Code completions

- `Code Web Chat: Code Completion` - Get code at cursor using API tool.
- `Code Web Chat: Code Completion to Clipboard` - Copy the code completion prompt to clipboard.

### Version Control

- `Code Web Chat: Commit Changes` - Generate a commit message for staged changes and commit.

### Misc

- `Code Web Chat: Settings` - Open settings wizard

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Community</span>

Please be welcomed in [discussions](https://github.com/robertpiosik/CodeWebChat/discussions) and [/r/CodeWebChat](https://www.reddit.com/r/CodeWebChat).

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Donations</span>

If you use CWC daily, [buying a coffee](https://buymeacoffee.com/robertpiosik) is a great way to show your support for the project.

**BTC:** bc1qfzajl0fc4347knr6n5hhuk52ufr4sau04su5te

**ETH:** 0x532eA8CA70aBfbA6bfE35e6B3b7b301b175Cf86D

**XMR:** 84whVjApZJtSeRb2eEbZ1pJ7yuBoGoWHGA4JuiFvdXVBXnaRYyQ3S4kTEuzgKjpxyr3nxn1XHt9yWTRqZ3XGfY35L4yDm6R

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Contributing</span>

All contributions are welcome. Feel free to submit pull requests, feature requests and bug reports.

<hr />

Copyright © 2025 [Robert Piosik](https://x.com/robertpiosik) \
E-mail: robertpiosik@gmail.com \
Telegram: @robertpiosik
