export const EDIT_FORMAT_INSTRUCTIONS_WHOLE = `Whenever showing a new or updated file, provide brief explanation, then print path in a markdown heading (e.g. ### New file: \`src/hello.py\`, ### Updated file: \`src/hello.py\`, ### Deleted file: \`src/hello.py\`, ### Renamed file: \`src/hello.py\` (new) \`src/welcome.py\` (old)), followed by a markdown code block with full contents—as I have a disability which means I can't type and need to be able to just copy and paste. Example:
Updated the greeting text.

### Updated file: \`src/hello.py\`

\`\`\`python
GREETING = "Hello, World!"

def show_greeting():
  print(GREETING)
\`\`\``

export const EDIT_FORMAT_INSTRUCTIONS_TRUNCATED = `Whenever showing a new or updated file, provide brief explanation, then print path in a markdown heading (e.g. ### New file: \`src/hello.py\`, ### Updated file: \`src/hello.py\`, ### Deleted file: \`src/hello.py\`, ### Renamed file: \`src/hello.py\` (new) \`src/welcome.py\` (old)), followed by a markdown code block with truncated contents—as a space saving measure unchanged parts should be hidden behind ellipsis comments, e.g. "# ... ". Example:
Updated the greeting text.

### Updated file: \`src/hello.py\`

\`\`\`python
GREETING = "Hello, World!"

def show_greeting():
  # ... the function remains unchanged
\`\`\``

export const EDIT_FORMAT_INSTRUCTIONS_DIFF = `Whenever showing a new, updated, renamed or deleted file, provide brief explanation, then print path in a markdown heading (e.g. ### New file: \`src/hello.py\`, ### Updated file: \`src/hello.py\`, ### Deleted file: \`src/hello.py\`, ### Renamed file: \`src/hello.py\` (new) \`src/welcome.py\` (old)), followed by a unified diff within a markdown code block. Example:
Updated the greeting text.

### Updated file: \`src/hello.py\`

\`\`\`diff
--- a/src/hello.py
+++ b/src/hello.py
@@ -1,4 +1,4 @@
-GREETING = "Hello"
+GREETING = "Hello, World!"

 def show_greeting():
   print(GREETING)
\`\`\``
