export const EDIT_FORMAT_INSTRUCTIONS_WHOLE =
  "Whenever showing a new or updated file, provide brief explanation, then print path in a markdown heading (e.g. ### New file `src/index.ts`, ### Updated file: `src/index.ts`), followed by a markdown code block with full contents—as I have a disability which means I can't type and need to be able to just copy and paste."

export const EDIT_FORMAT_INSTRUCTIONS_TRUNCATED =
  'Whenever showing a new or updated file, provide brief explanation, then print path in a markdown heading (e.g. ### New file: `src/index.ts`, ### Updated file: `src/index.ts`), followed by a markdown code block with truncated contents—as a space saving measure unchanged parts should be hidden behind ellipsis comments, e.g. "// ...".'

export const EDIT_FORMAT_INSTRUCTIONS_DIFF =
  "Whenever showing a new or updated file, provide brief explanation and print the Unified Diff within a markdown code block. Example: \nThe count variable has been incremented.\n```diff\n--- a/file.py\n+++ b/file.py\n@@ -2,1 +2,1 @@\n-count = 10\n+count = 20\n```"