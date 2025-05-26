---
title: File Refactoring
sidebar_position: 3
---

Modify a file based on natural language instructions.

## API message structure

```
<files>
  <text title="...">...</text>
  // other websites...
  <file path="...">...</file>
  // other files excl. current editor...
  <file path="...">...</file> // current editor
</files>
User requested refactor of a file `[PATH]`. Please show me the full code of the updated <file>, without explanations or any other text. I have a disability which means I can't type and need to be able to copy and paste the full code.
```

## Available commands

##### `Code Web Chat: Refactor this File`

Refactors the current file using the default model.

##### `Code Web Chat: Refactor this File with...`

Lets you select which model to use for refactoring.

##### `Code Web Chat: Refactor to Clipboard`

Instead of applying changes directly, copies the refactoring prompt to your clipboard for use in other tools.

##### `Code Web Chat: Change Default Refactoring Model`

Configure which model should be used as the default for refactoring.
