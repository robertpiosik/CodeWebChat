export const EDIT_FORMAT_INSTRUCTIONS_WHOLE =
  "Whenever showing a new or updated file, provide brief explanation, then print path in a markdown heading (e.g. ### New file `src/counter.py`, ### Updated file: `src/counter.py`), followed by a markdown code block with full contents—as I have a disability which means I can't type and need to be able to just copy and paste. Example:\nThe count variable has been incremented.\n### Updated file: `src/counter.py`\n```python\ncount = 20\n```"

export const EDIT_FORMAT_INSTRUCTIONS_TRUNCATED =
  'Whenever showing a new or updated file, provide brief explanation, then print path in a markdown heading (e.g. ### New file: `src/counter.py`, ### Updated file: `src/counter.py`), followed by a markdown code block with truncated contents—as a space saving measure unchanged parts should be hidden behind ellipsis comments, e.g. "// ...". Example:\nThe count variable has been incremented.\n### Updated file: `src/counter.py`\n```python\n// ...\ncount = 20\n// ...\n```'

export const EDIT_FORMAT_INSTRUCTIONS_DIFF =
  'Whenever showing a new or updated file, provide brief explanation, then print path in a markdown heading (e.g. ### New file: `src/counter.py`, ### Updated file: `src/counter.py`), followed by a unified diff within a markdown code block. Example:\nThe count variable has been incremented.\n### Updated file: `src/counter.py`\n```diff\n--- a/src/counter.py\n+++ b/src/counter.py\n@@ -2,1 +2,1 @@\n-count = 10\n+count = 20\n```'
