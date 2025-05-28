---
title: Refactoring
sidebar_position: 3
---

Modify files based on natural language instructions.

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

- `Code Web Chat: Refactor` - Modify files based on natural language instructions.
