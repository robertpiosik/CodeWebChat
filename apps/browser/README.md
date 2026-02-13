# Autofill for Code Web Chat

This extension exchanges messages with a locally run WebSockets server to open new tabs and autofill prompts.

It also places "APPLY RESPONSE" button under messages. It's an alias for the _copy to clipboard_ button.

## Permissions

The extension requests a minimal set of permissions.

- `storage` - Used to temporarily store prompts for [a content script](https://github.com/robertpiosik/CodeWebChat/tree/dev/apps/browser/src/content-scripts/send-prompt-content-script), and to save extension settings.
- `alarms` (Chrome only) - Used to implement a keep-alive mechanism for the background service worker to ensure the WebSocket connection stays active.
- `host_permissions` (localhost) - Required to connect to the local WebSocket server (`ws://localhost:55155`), managed by the VS Code extension.

Firefox only:

- `contextualIdentities` - Required for Firefox Containers support.
- `cookies` (optional) - Required for Firefox Containers support.
