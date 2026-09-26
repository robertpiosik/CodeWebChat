# Autofill for Code Web Chat

This browser extension communicates with the editor via a locally run WebSockets server.

Serves two purposes:

1. Autofilling the constructed prompt text
2. Placing _Apply Response_ button under responses

> [!TIP]
> Elevate your workflow with smart workspaces (called [projects](https://help.openai.com/en/articles/10169521-projects-in-chatgpt), [gems](https://gemini.google/pl/overview/gems), or [spaces](https://docs.github.com/en/copilot/concepts/context/spaces)).

> [!NOTE]
> The _Apply Response_ button is an alias for the copy button typically placed at the end of a chat response. Once clicked, it copies the response and notifies the editor via a WebSocket message to read the clipboard.

> [!IMPORTANT]
> Prompt text is never submitted or response accepted automatically.

## Stores

- [Chrome Web Store](https://chromewebstore.google.com/detail/autofill-for-code-web-chat/ljookipcanaglfaocjbgdicfbdhhjffp)
- [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/autofill-for-code-web-chat/)

## Permissions

The extension functions with minimal permissions.

- `storage` - Used to temporarily store prompts for [a content script](https://github.com/robertpiosik/CodeWebChat/tree/dev/apps/browser/src/content-scripts/send-prompt-content-script), and to save extension settings.
- `alarms` (Chrome only) - Used to implement a keep-alive mechanism for the background service worker to ensure the WebSocket connection stays active.
- `host_permissions` (localhost) - Required to connect to the local WebSocket server (`ws://localhost:55155`), managed by the VS Code extension.

Firefox only:

- `contextualIdentities` - Required for Firefox Containers support.
- `cookies` (optional) - Required for Firefox Containers support.
