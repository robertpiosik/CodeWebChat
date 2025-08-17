# Code Web Chat

<a href="https://marketplace.visualstudio.com/items?itemName=robertpiosik.gemini-coder" target="_blank"><img src="https://img.shields.io/badge/Install-VS_Code_Marketplace-blue" alt="Get from Visual Studio Code Marketplace" /></a> <a href="https://x.com/CodeWebChat" target="_blank"><img src="https://img.shields.io/badge/Follow_on_X-@CodeWebChat-black" alt="Follow on X" /></a> <a href="https://reddit.com/r/CodeWebChat" target="_blank"><img src="https://img.shields.io/badge/Join_subreddit-r/CodeWebChat-orange" alt="Join subreddit /r/CodeWebChat" /></a>

A 100% free and open source AI pair programming tool. By focusing on context management, it delivers accuracy, predictability, speed and cost efficiency unmatched by IDE or terminal based coding agents. CWC is designed for real-world programming, saving you sanity, money and time.

✅ **Free coding with 15+ chatbots** \
✅ **All the necessary API tools** \
🙋 Built by an independent developer

<p>
<img src="https://github.com/robertpiosik/CodeWebChat/raw/HEAD/packages/shared/src/media/demo.gif" alt="Walkthrough" />
</p>

**With CWC you can:**

- Enhance your coding workflow with AI:
  - granularly select folders and files for context,
  - enter instructions,
  - initialize new chat or send an API request,
  - apply response, hands-free!
- Get accurate code completions.
- Generate meaningful commit messages.

**Guiding principles:**

- initialize chatbots—don't scrape responses
- complete privacy—works 100% locally
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

**Code Completions** \
Get accurate code at cursor from state-of-the-art reasoning models.

**Edit Context** \
Modify files based on natural language instructions.

**Intelligent Update** \
Integrate truncated code blocks and fix malformed diffs.

**Commit Messages** \
Generate meaningful summaries of changes adhering to your preferred style.

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Commands</span>

### Handling AI responses

- `Code Web Chat: Apply Chat Response` - Integrate with the codebase copied to clipboard overall chat response or a single code block.
- `Code Web Chat: Revert Last Changes` - Revert above command.

### Code completions

- `Code Web Chat: Code Completion` - Get code at cursor using API tool.
- `Code Web Chat: Code Completion using...` - ...with configuration selection.

### Version Control

- `Code Web Chat: Commit Changes` - Generate a commit message for staged changes and commit.

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Community</span>

Please be welcomed in [discussions](https://github.com/robertpiosik/CodeWebChat/discussions) and [/r/CodeWebChat](https://www.reddit.com/r/CodeWebChat).

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Donations</span>

If you use CWC daily, [buying a $3 coffee](https://buymeacoffee.com/robertpiosik) is a great way to show your support for the project.

**BTC:** bc1qfzajl0fc4347knr6n5hhuk52ufr4sau04su5te

**ETH:** 0x532eA8CA70aBfbA6bfE35e6B3b7b301b175Cf86D

**XMR:** 84whVjApZJtSeRb2eEbZ1pJ7yuBoGoWHGA4JuiFvdXVBXnaRYyQ3S4kTEuzgKjpxyr3nxn1XHt9yWTRqZ3XGfY35L4yDm6R

## <span style="background-color: #fbb100; color: black; padding: 0.2em 0.6em; border-radius: 999px">Contributing</span>

All contributions are welcome. Feel free to submit pull requests, feature requests and bug reports.

<hr />

Copyright © 2025 [Robert Piosik](https://x.com/robertpiosik) \
E-mail: robertpiosik@gmail.com \
Telegram: @robertpiosik
