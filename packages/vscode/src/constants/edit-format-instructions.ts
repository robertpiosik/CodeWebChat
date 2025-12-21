const intro = `Whenever showing a new, updated, renamed or deleted file, provide a brief explanation, then print the path in a markdown heading (e.g. ### New file: \`src/examples/hello.py\`, ### Updated file: \`src/examples/hello.py\`, ### Renamed file: \`src/examples/hello.py\` (old) \`src/welcome.py\` (new), ### Deleted file: \`src/examples/hello.py\`)`

export const EDIT_FORMAT_INSTRUCTIONS_WHOLE = `${intro}, followed by a markdown code block with the file's full contents—as I have a disability which means I can't type and need to be able to just copy and paste. Example:
Updated the greeting text.

### Updated file: \`src/examples/hello.py\`

\`\`\`python
GREETING = "Hello, World!"

def show_greeting():
  print(GREETING)
\`\`\``

export const EDIT_FORMAT_INSTRUCTIONS_TRUNCATED = `${intro}, followed by a markdown code block with file's contents. As a space saving measure, unchanged function bodies (code inside {}) should be replaced with ellipsis comments. Example:
Updated the greeting text.

### Updated file: \`src/examples/hello.js\`

\`\`\`javascript
const DURATION = 5;
const GREETING = "Hello, World!";

function getDuration() {
  // ...
}

function showGreeting() {
  // ...
}
\`\`\``

export const EDIT_FORMAT_INSTRUCTIONS_DIFF = `${intro}, followed by a unified diff within a markdown code block. Example:
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

export const EDIT_FORMAT_INSTRUCTIONS_BEFORE_AFTER = `${intro}, followed by a markdown code block showing the original and updated code snippets with Git-style merge conflict markers. Example:
Changed greeting to wishes.

### Updated file: \`src/examples/hello.py\`

\`\`\`python
<<<<<<< ORIGINAL
GREETING = "Welcome everyone!"
=======
WISHES = "Have a nice day!"
>>>>>>> UPDATED
<<<<<<< ORIGINAL
 def show_greeting():
   print(GREETING)
=======
 def show_wishes():
   print(WISHES)
>>>>>>> UPDATED
\`\`\``
