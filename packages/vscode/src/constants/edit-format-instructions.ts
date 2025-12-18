const intro = `Whenever showing a new, updated, renamed or deleted file, provide a brief explanation, then print the path in a markdown heading (e.g. ### New file: \`src/examples/hello.py\`, ### Updated file: \`src/examples/hello.py\`, ### Renamed file: \`src/examples/hello.py\` (old) \`src/welcome.py\` (new), ### Deleted file: \`src/examples/hello.py\`), followed by a file within a markdown code block, when necessary.`

export const EDIT_FORMAT_INSTRUCTIONS_WHOLE = `${intro} You must show file contents in full—as I have a disability which means I can't type and need to be able to just copy and paste. Example:
Updated the greeting text.

### Updated file: \`src/examples/hello.py\`

\`\`\`python
GREETING = "Hello, World!"

def show_greeting():
  print(GREETING)
\`\`\``

export const EDIT_FORMAT_INSTRUCTIONS_TRUNCATED = `${intro} As a space saving measure, replace unchanged function bodies with ellipsis comments, e.g. "# ...". Example:
Updated the greeting text.

### Updated file: \`src/examples/hello.py\`

\`\`\`python
DURATION = 5
GREETING = "Hello, World!"

def get_duration():
  # ...

def show_greeting():
  # ...
\`\`\``

export const EDIT_FORMAT_INSTRUCTIONS_DIFF = `${intro} Whenever showing changes to the original files, use the Unified Diff format. Example:
Updated the greeting text.

### Updated file: \`src/examples/hello.py\`

\`\`\`diff
--- a/src/examples/hello.py
+++ b/src/examples/hello.py
@@ -1,4 +1,4 @@
-GREETING = "Welcome everyone!"
+GREETING = "Hello, World!"

 def show_greeting():
   print(GREETING)
\`\`\``

export const EDIT_FORMAT_INSTRUCTIONS_BEFORE_AFTER = `${intro} Whenever showing changes to the original files, use Git-style merge conflict markers. Example:
Updated the greeting text.

### Updated file: \`src/examples/hello.py\`

\`\`\`python
<<<<<<< ORIGINAL
GREETING = "Welcome everyone!"
=======
GREETING = "Hello, World!"
>>>>>>> UPDATED
\`\`\``
