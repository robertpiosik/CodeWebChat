module.exports = {
  // --- Uri ---
  Uri: {
    file: jest.fn((path) => ({
      fsPath: path,
      path: path,
      // Add other Uri properties/methods if required by tests later
      toString: () => `file://${path}`
    })),
    parse: jest.fn((str) => ({
      fsPath: str.startsWith('file://') ? str.substring(7) : str,
      path: str.startsWith('file://') ? str.substring(7) : str,
      toString: () => str
      // Add other Uri properties/methods if required by tests later
    }))
  },

  // --- Workspace ---
  workspace: {
    workspaceFolders: undefined, // Tests can override this if needed: e.g., [{ uri: { fsPath: '/mock/workspace' } }]
    applyEdit: jest.fn(() => Promise.resolve(true)), // Mock function for applying edits
    fs: {
      readFile: jest.fn(() => Promise.resolve(new Uint8Array())) // Mock file system read
      // Add writeFile, stat, etc., if needed by other tests
    }
    // Add getConfiguration, etc., if needed by other tests
  },

  // --- Window ---
  window: {
    showErrorMessage: jest.fn(),
    showInformationMessage: jest.fn()
    // Add activeTextEditor, showQuickPick, etc., if needed by other tests
  },

  // --- Classes ---
  // Provide minimal class structures used in WorkspaceEdit or elsewhere
  Position: class {
    constructor(line, character) {
      this.line = line
      this.character = character
    }
  },
  Range: class {
    constructor(startLine, startChar, endLine, endChar) {
      this.start = new module.exports.Position(startLine, startChar)
      this.end = new module.exports.Position(endLine, endChar)
    }
  },
  WorkspaceEdit: class {
    // Add minimal stubs for methods used (replace, createFile, etc.)
    replace() {}
    createFile() {}
    // Add others if needed by tests invoking patch-handler directly
  },

  // --- Enums/Constants ---
  // Add simple mocks if needed, e.g.:
  // FileType: { File: 1, Directory: 2 },

  // --- Other ---
  // Add commands, env, etc., with minimal mocks if needed later
  commands: {
    executeCommand: jest.fn(() => Promise.resolve()),
    registerCommand: jest.fn(() => ({ dispose: jest.fn() }))
  }
}
