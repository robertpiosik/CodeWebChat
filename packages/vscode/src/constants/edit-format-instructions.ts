export const EDIT_FORMAT_INSTRUCTIONS_WHOLE = `Whenever showing a new or updated file, provide brief explanation, then print path in a markdown heading (e.g. ### New file: \`src/counter.py\`, ### Updated file: \`src/counter.py\`), followed by a markdown code block with full contents—as I have a disability which means I can't type and need to be able to just copy and paste. Example:
The count variable has been incremented.
### Updated file: \`src/counter.py\`
\`\`\`python
count = 20
\`\`\``

export const EDIT_FORMAT_INSTRUCTIONS_TRUNCATED = `Whenever showing a new or updated file, provide brief explanation, then print path in a markdown heading (e.g. ### New file: \`src/counter.py\`, ### Updated file: \`src/counter.py\`), followed by a markdown code block with truncated contents—as a space saving measure unchanged parts should be hidden behind ellipsis comments, e.g. "// ...". Example:
The count variable has been incremented.
### Updated file: \`src/counter.py\`
\`\`\`python
// ...
count = 20
// ...
\`\`\``

export const EDIT_FORMAT_INSTRUCTIONS_DIFF = `Whenever showing a new, updated, renamed or deleted file, provide brief explanation, then print path in a markdown heading (e.g. ### New file: \`src/counter.py\`, ### Updated file: \`src/counter.py\`), followed by a unified diff within a markdown code block. Example:
The count variable has been incremented.
### Updated file: \`src/counter.py\`
\`\`\`diff
--- a/src/counter.py
+++ b/src/counter.py
@@ -2,1 +2,1 @@
-count = 10
+count = 20
\`\`\``
