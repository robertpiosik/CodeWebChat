const intro = `Whenever showing a new, updated, renamed or deleted file, provide a brief explanation, then print path in a markdown heading (e.g. ### New file: \`src/hello.py\`, ### Updated file: \`src/hello.py\`, ### Renamed file: \`src/hello.py\` (old) \`src/welcome.py\` (new), ### Deleted file: \`src/hello.py\`)`

export const EDIT_FORMAT_INSTRUCTIONS_WHOLE = `${intro}, followed by a markdown code block with full contents—as I have a disability which means I can't type and need to be able to just copy and paste. Example:
Updated the greeting text.

### Updated file: \`src/hello.py\`

\`\`\`python
GREETING = "Hello, World!"

def show_greeting():
  print(GREETING)
\`\`\``

export const EDIT_FORMAT_INSTRUCTIONS_TRUNCATED = `${intro}, followed by a markdown code block with truncated contents—as a space saving measure unchanged parts should be hidden behind ellipsis comments, e.g. "# ... ". Example:
Updated the greeting text.

### Updated file: \`src/hello.py\`

\`\`\`python
GREETING = "Hello, World!"

def show_greeting():
  # ... the function remains unchanged
\`\`\``

export const EDIT_FORMAT_INSTRUCTIONS_DIFF = `${intro}, followed by a unified diff within a markdown code block. Example:
Updated the greeting text.

### Updated file: \`src/hello.py\`

\`\`\`diff
--- a/src/hello.py
+++ b/src/hello.py
@@ -1,4 +1,4 @@
-GREETING = "Welcome everyone!"
+GREETING = "Hello, World!"

 def show_greeting():
   print(GREETING)
\`\`\``

export const EDIT_FORMAT_INSTRUCTIONS_MERGE_CONFLICT = `${intro}, followed by a markdown code block showing the original and updated code with Git-style merge conflict markers. Example:
Updated the greeting text.

### Updated file: \`src/hello.py\`

\`\`\`python
<<<<<<< ORIGINAL
GREETING = "Welcome everyone!"
=======
GREETING = "Hello, World!"
>>>>>>> UPDATED

def show_greeting():
  print(GREETING)
\`\`\``
