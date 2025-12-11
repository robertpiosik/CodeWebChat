import { useState } from 'react'
import { StageFilesModal } from './StageFilesModal'

export default {
  component: StageFilesModal
}

const mock_files = [
  { path: 'packages/ui/src/components/Button.tsx', status: 7 }, // Untracked
  { path: 'packages/ui/src/components/Modal.tsx', status: 5 }, // Modified
  { path: 'packages/vscode/src/utils/helpers.ts', status: 6 }, // Deleted
  { path: 'packages/shared/src/index.ts', status: 5 }, // Modified
  { path: 'README.md', status: 7 } // Untracked
]

export const Default = () => {
  const [visible, set_visible] = useState(true)

  const handle_stage = (files: string[]) => {
    alert(`Staging ${files.length} files:\n${files.join('\n')}`)
    set_visible(false)
  }

  const handle_cancel = () => {
    set_visible(false)
  }

  const handle_go_to_file = (file: string) => {
    alert(`Go to file: ${file}`)
  }

  const handle_show_diff = (file: string) => {
    alert(`Show diff for file: ${file}`)
  }

  return visible ? (
    <StageFilesModal
      files={mock_files}
      on_stage={handle_stage}
      on_cancel={handle_cancel}
      on_go_to_file={handle_go_to_file}
      on_show_diff={handle_show_diff}
    />
  ) : null
}
