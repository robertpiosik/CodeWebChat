# Code Web Chat

<a href="https://marketplace.visualstudio.com/items?itemName=robertpiosik.gemini-coder" target="_blank"><img src="https://img.shields.io/badge/Download-VS_Code_Marketplace-blue" alt="Download from Visual Studio Code Marketplace" /></a>

<p>
<img src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/packages/shared/src/media/demo.gif" alt="Walkthrough" />
</p>

100% free and open source AI workflow tool that connects your editor with 10+ popular chatbots and has all the necessary API tools built-in.

**With CWC you can:**

- Granularly select folders and files from your project to copy them as XML-formatted text.
- Type your task and initialize any chatbot, or send an API request.
- Get code completions using reasoning models and all selected files as context.
- Generate precise commit messages by referencing the original state of the modified files.

**Guiding principles:**

- initialize chatbots—don't scrape responses
- univarsal—enable any workflow
- privacy first—zero telemetry
- lightweight—about 1MB of code

**CWC is for you if:**

- you're an experienced engineer working on a large codebase
- you're a student or hobbyist on a budget

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Chatbot initialization</span>

Code with your favorite chatbot without tedious copy-pasting. The Connector extension bridges your editor and the browser.

- [Chrome Web Store](https://chromewebstore.google.com/detail/code-web-chat-connector/ljookipcanaglfaocjbgdicfbdhhjffp)
- [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/gemini-coder-connector/)

**Supported chatbots:**

**AI Studio** • **ChatGPT** • **Claude** • **DeepSeek** • **Doubao** • **Gemini** • **Grok** • **HuggingChat** • **Mistral** • **Open WebUI** • **OpenRouter Chat** • **Perplexity** • **Qwen** • **Yuanbao**

> <small>**Legal Disclaimer:** After chat initialization, the extension does not read the incoming message. The injected _Apply response_ button is not a means of automatic output extraction, it's an alias for the original _copy to clipboard_ button.</small>

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">API Tools</span>

CWC includes all the necessary API tools.

### Code Completions

Get code at cursor from state-of-the-art reasoning models.

✅ Includes selected context \
✅ Designed for on-demand use

### Edit Context

Create and modify files in context based on natural language instructions.

✅ Multi-file updates in a single API call \
✅ Works like web chat->apply response

### Intelligent Update

When applying chat response, update files based on code blocks in truncated edit format and fix malformed diffs.

✅ Regenerates whole files in concurrent API calls \
✅ Smaller models like Gemini Flash are sufficient

### Commit Messages

Generate meaningful commit messages precisely adhering to your preferred style.

✅ Includes affected files in full \
✅ Customizable instructions

**Predefined API providers:**

**Anthropic** • **Cerebras** • **Chutes** • **DeepInfra** • **DeepSeek** • **Fireworks** • **Gemini** • **Hyperbolic** • **Mistral** • **OpenAI** • **OpenRouter** • **TogetherAI**

ℹ️ Any OpenAI-API compatible endpoint works with CWC \
🔒️ API keys are [stored encrypted](https://code.visualstudio.com/api/references/vscode-api#SecretStorage)

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

### Applying chat responses

- `Code Web Chat: Apply Chat Response` - Integrate with the codebase copied overall chat response or a single code block.
- `Code Web Chat: Revert Last Changes` - Revert last applied chat response or the Edit Context API tool use.

### Chat

- `Code Web Chat: Chat` - Type instructions and open chatbot with default preset.
- `Code Web Chat: Chat using...` - Type instructions and open chatbot with preset selection.
- `Code Web Chat: Chat to Clipboard` - Enter instructions and copy prompt to clipboard.

### Context

- `Code Web Chat: Copy Context` - Copy selected files and websites to clipboard.
- `Code Web Chat: Apply Context from Clipboard` - Sets the context by parsing file paths from clipboard text.

### Version Control

- `Code Web Chat: Commit Changes` - Generate a commit message for staged changes and commit.

### Misc

- `Code Web Chat: Settings` - Open settings wizard

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Settings</span>

### Chatbot initialization

- `Code Web Chat: Edit Format Instructions Truncated` - Style instructions for chat responses when using truncated format.

- `Code Web Chat: Edit Format Instructions Whole` - Style instructions for chat responses when showing complete files.

- `Code Web Chat: Edit Format Instructions Diff` - Style instructions for chat responses when using diff format.

### Commit Messages

- `Code Web Chat: Commit Message Instructions` - The instructions used when generating a commit message.

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Community</span>

Please be welcomed in [discussions](https://github.com/robertpiosik/CodeWebChat/discussions) and in our subreddit [/r/CodeWebChat](https://www.reddit.com/r/CodeWebChat).

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Donations</span>

If you find CWC helpful, please consider [supporting the project](https://buymeacoffee.com/robertpiosik). Thank you!

**BTC:** bc1qfzajl0fc4347knr6n5hhuk52ufr4sau04su5te

**ETH:** 0x532eA8CA70aBfbA6bfE35e6B3b7b301b175Cf86D

**XMR:** 84whVjApZJtSeRb2eEbZ1pJ7yuBoGoWHGA4JuiFvdXVBXnaRYyQ3S4kTEuzgKjpxyr3nxn1XHt9yWTRqZ3XGfY35L4yDm6R

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Contributing</span>

All contributions are welcome. Feel free to submit pull requests, feature requests and bug reports.

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">License</span>

Copyright © 2025-present [Robert Piosik](https://x.com/robertpiosik)
<br />E-mail: robertpiosik@gmail.com
<br />Telegram: @robertpiosik
<br />License: [GPL-3.0](https://github.com/robertpiosik/CodeWebChat/blob/master/LICENSE)
