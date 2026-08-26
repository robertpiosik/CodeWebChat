# Autofill for Code Web Chat

The browser extension communicates with the editor via a locally run WebSockets server.

It serves two purposes:

1. Autofilling the constructed prompt text

2. Placing Apply Response button under responses

> [!NOTE]
> The Apply Response button is an alias for the commonly present response copying feature with an additional hint for the editor to process the clipboard text.

> [!IMPORTANT]
> Prompt text is never submitted or response accepted automatically.

## Permissions

The extension requires minimal permissions.

- `storage` - Used to temporarily store prompts for [a content script](https://github.com/robertpiosik/CodeWebChat/tree/dev/apps/browser/src/content-scripts/send-prompt-content-script), and to save extension settings.
- `alarms` (Chrome only) - Used to implement a keep-alive mechanism for the background service worker to ensure the WebSocket connection stays active.
- `host_permissions` (localhost) - Required to connect to the local WebSocket server (`ws://localhost:55155`), managed by the VS Code extension.

Firefox only:

- `contextualIdentities` - Required for Firefox Containers support.
- `cookies` (optional) - Required for Firefox Containers support.
