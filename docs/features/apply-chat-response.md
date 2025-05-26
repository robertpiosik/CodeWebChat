---
title: Apply Chat Response
sidebar_position: 4
---

Smart tool that automatically integrates multi-file changes with the codebase by modyfing exisitng files or creating new ones.

## Supported edit formats

### Truncated

Uses refactoring tool (without context) for updating the file.

### Whole

Repalces updated file in place.

### Diff

Uses `git apply` then fallbacks to find & replace processor, then to file refactoring tool (without context).

## Available commands

##### `Code Web Chat: Apply Chat Response`

Applies changes to the current file using the default model.

##### `Code Web Chat: Revert Last Applied Changes`

Reverts files to their state before the last application of changes.
