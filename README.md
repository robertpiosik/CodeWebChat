# Code Web Chat

<a href="https://marketplace.visualstudio.com/items?itemName=robertpiosik.gemini-coder" target="_blank"><img src="https://img.shields.io/badge/Download-VS_Code_Marketplace-blue" alt="Download from Visual Studio Code Marketplace" /></a>

<p>
<img src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/packages/shared/src/media/demo.gif" alt="Walkthrough" />
</p>

100% free and open source AI pair programming tool designed for software engineers. Created by an independent developer.

✅ **Use your favorite chatbot for coding** \
✅ **Set model, thinking mode, etc. with presets** \
✅ **All the necessary API tools built-in** \
⚡️ **Blazing fast coding compared to agents**

**With CWC you can:**

- Granularly select folders and files to copy them as XML-formatted text.
- Type your task, pick edit format (whole/truncated/diff), initialize a chatbot (or send an API request) and automatically integrate the response with the codebase.
- Get accurate code completions using the selected context with SOTA reasoning models.
- Generate meaningful commit messages by referencing the original state of the modified files.
- Include websites parsed to markdown in context.

**Guiding principles:**

- initialize chatbots—don't scrape responses
- 100% local processing—complete privacy
- lightweight—about 2MB of code

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
- HuggingChat
- Mistral
- Open WebUI
- OpenRouter Chat
- Perplexity
- Kimi
- Qwen
- Yuanbao

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

### Code completions

- `Code Web Chat: Code Completion` - Get inline autocompletion at the cursor position.
- `Code Web Chat: Code Completion with Suggestions` - Get inline autocompletion at the cursor position that follows given suggestions.
- `Code Web Chat: Code Completion to Clipboard` - Copy inline autocompletion prompt to clipboard.
- `Code Web Chat: Code Completion with Suggestions to Clipboard` - Copy inline autocompletion with suggestions prompt to clipboard.
- `Code Web Chat: Code Completion in Chat` - Use chatbot for code completion.
- `Code Web Chat: Code Completion in Chat with...` - Use chatbot for code completion with selected preset.

### Editing context

- `Code Web Chat: Edit Context` - Create and modify files in context based on natural language instructions.

### Handling AI responses

- `Code Web Chat: Apply Chat Response` - Integrate with the codebase copied overall chat response or a single code block.
- `Code Web Chat: Revert Last Changes` - Revert above command.

### Chat

- `Code Web Chat: Edit Context in Chat` - Type instructions and open chatbot with default preset.
- `Code Web Chat: Edit Context in Chat using...` - Same as above, but with preset selection.
- `Code Web Chat: Edit Context to Clipboard` - Enter instructions and copy prompt to clipboard.
- `Code Web Chat: Ask about Context` - Type instructions and open chatbot with context but without edit format instructions.
- `Code Web Chat: Ask about Context using...` - Same as above, but with preset selection.
- `Code Web Chat: No context chat` - Open chatbot without any context.
- `Code Web Chat: No context chat using...` - Same as above, but with preset selection.

### Context

- `Code Web Chat: Copy Context` - Copy selected files and websites to clipboard.
- `Code Web Chat: Apply Context from Clipboard` - Sets the context by parsing file paths from clipboard text.

### Version Control

- `Code Web Chat: Commit Changes` - Generate a commit message for staged changes and commit.

### Misc

- `Code Web Chat: Settings` - Open settings wizard

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Community</span>

Please be welcomed in [discussions](https://github.com/robertpiosik/CodeWebChat/discussions) and [/r/CodeWebChat](https://www.reddit.com/r/CodeWebChat).

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Donations</span>

If you like Code Web Chat, [buying a coffee](https://buymeacoffee.com/robertpiosik) is a great way to show your support for the project.

**BTC:** bc1qfzajl0fc4347knr6n5hhuk52ufr4sau04su5te

**ETH:** 0x532eA8CA70aBfbA6bfE35e6B3b7b301b175Cf86D

**XMR:** 84whVjApZJtSeRb2eEbZ1pJ7yuBoGoWHGA4JuiFvdXVBXnaRYyQ3S4kTEuzgKjpxyr3nxn1XHt9yWTRqZ3XGfY35L4yDm6R

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Contributing</span>

All contributions are welcome. Feel free to submit pull requests, feature requests and bug reports.

<hr />

Copyright © 2025 [Robert Piosik](https://x.com/robertpiosik) \
E-mail: robertpiosik@gmail.com \
Telegram: @robertpiosik
