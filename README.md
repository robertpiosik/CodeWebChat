# Code Web Chat

<a href="https://marketplace.visualstudio.com/items?itemName=robertpiosik.gemini-coder" target="_blank"><img src="https://img.shields.io/badge/Install-VS_Code_Marketplace-blue" alt="Get from Visual Studio Code Marketplace" /></a> <a href="https://x.com/CodeWebChat" target="_blank"><img src="https://img.shields.io/badge/Follow_on_X-@CodeWebChat-black" alt="Follow on X" /></a> <a href="https://reddit.com/r/CodeWebChat" target="_blank"><img src="https://img.shields.io/badge/Join_subreddit-r/CodeWebChat-orange" alt="Join subreddit /r/CodeWebChat" /></a> <a href="https://discord.com/invite/KJySXsrSX5" target="_blank"><img src="https://img.shields.io/badge/Chat-Discord-7289da" alt="Join Discord server" /></a>

**A 100% free and open-source tool for AI pair programming.** Its simple, yet highly effecive workflow is designed for unmatched accuracy, speed and cost-efficiency—select context, type instructions and send prompt with a free chatbot or an API provider. When the model finishes, its response is ready for a one-click integration with the codebase.

Available in VS Code, Cursor, and other forks.

✅ **Edit context** with 15+ free chatbots or API providers \
✅ **Apply multi-file changes** from a single response \
✅ **Code completions** with reasoning models \
✅ **Commit messages** in your team's style

<p>
<img src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/packages/shared/src/media/demo.gif" alt="Walkthrough" />
</p>

### Guiding principles

- Initialize chatbots—don't scrape responses
- Free forever—community effort
- Privacy first—operates locally
- Lightweight—2MB of code

### Why non-agentic?

**Non-agentic is predictable** \
Granular control over context let you scope the model precisely to the task and develop intuition for its outputs.

**Non-agentic is cost-efficient** \
Match the model to the task's complexity, not the entire codebase's. This lets you use lighter, faster, and cheaper models, saving time and money.

**Non-agentic is blazing fast** \
A single prompt yields a complete set of changes across all necessary files—no need to wait for a multi-step agent to finish.

**Non-agentic avoids context pollution** \
When the model isn't getting your intent on the first try, just adjust context, instructions and resend without distracting it with previous attempts.

|                       | Non-agentic |  Coding agents   |
| :-------------------- | :---------: | :--------------: |
| **Messages per task** |      1      |       1-30       |
| **Completes in**      |   seconds   |     minutes      |
| **Token usage**       |   Minimal   | Sky is the limit |

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Chatbot initialization</span>

Install the Connector browser extension and never copy & paste again.

- [Chrome Web Store ↗](https://chromewebstore.google.com/detail/code-web-chat-connector/ljookipcanaglfaocjbgdicfbdhhjffp)
- [Firefox Add-ons ↗](https://addons.mozilla.org/en-US/firefox/addon/code-web-chat-connector/)

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

> <small>**Legal Disclaimer:** After chat initialization, the extension does not read the incoming message. The injected _Apply response_ button is not a means of automatic output extraction, it's an alias for the original _copy to clipboard_ button.</small>

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">API Tools</span>

CWC supports any OpenAI-API compatible provider for its built-in utilities.

**🛠️ Code Completions** \
Get accurate code at cursor from state-of-the-art reasoning models.

**🛠️ Edit Context** \
Modify files based on natural language instructions.

**🛠️ Intelligent Update** \
Integrate truncated code blocks and fix malformed diffs.

**🛠️ Commit Messages** \
Generate meaningful summaries of changes adhering to your preferred style.

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Commands</span>

### Handling AI responses

- `Code Web Chat: Apply Chat Response` - Integrate with the codebase copied to clipboard overall chat response or a single code block.
- `Code Web Chat: Apply Clipboard Content to Active Editor` - Serves as a flexible fallback for applying AI-generated edits, e.g. broken diffs.
- `Code Web Chat: Undo Last Changes` - Undo above command.

### Code completions

- `Code Web Chat: Code Completion` - Get code at cursor using API tool.
- `Code Web Chat: Code Completion using...` - ...with configuration selection.
- `Code Web Chat: Code Completion with Instructions` - Get code at cursor with instructions.

### Version Control

- `Code Web Chat: Commit Changes` - Generate a commit message for staged changes and commit.

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Community</span>

If you have a question about CWC, or want to help others, you're always welcome to join the conversation:

- [GitHub Discussions ↗](https://github.com/robertpiosik/CodeWebChat/discussions)
- [Discord ↗](https://discord.gg/KJySXsrSX5)
- [Reddit ↗](https://www.reddit.com/r/CodeWebChat)

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Donations</span>

[Buy me a coffee ↗](https://buymeacoffee.com/robertpiosik)

**BTC:** bc1qfzajl0fc4347knr6n5hhuk52ufr4sau04su5te

**ETH:** 0x532eA8CA70aBfbA6bfE35e6B3b7b301b175Cf86D

**XMR:** 84whVjApZJtSeRb2eEbZ1pJ7yuBoGoWHGA4JuiFvdXVBXnaRYyQ3S4kTEuzgKjpxyr3nxn1XHt9yWTRqZ3XGfY35L4yDm6R

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Contributing</span>

All contributions are welcome. Feel free to submit pull requests, feature requests and bug reports.

<hr />

Copyright © 2025 [Robert Piosik ↗](https://x.com/robertpiosik) \
E-mail: robertpiosik@gmail.com \
Telegram: @robertpiosik
