import { useState } from 'react'
import { StageFilesModal } from './StageFilesModal'

export default {
  component: StageFilesModal
}

const mock_files = [
  'packages/ui/src/components/Button.tsx',
  'packages/ui/src/components/Modal.tsx',
  'packages/vscode/src/utils/helpers.ts',
  'packages/shared/src/index.ts',
  'README.md'
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

  return visible ? (
    <StageFilesModal
      files={mock_files}
      on_stage={handle_stage}
      on_cancel={handle_cancel}
    />
  ) : null
}
