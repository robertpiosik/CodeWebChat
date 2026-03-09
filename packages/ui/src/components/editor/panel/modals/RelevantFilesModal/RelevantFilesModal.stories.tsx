import { useState } from 'react'
import { RelevantFilesModal } from './RelevantFilesModal'

export default {
  component: RelevantFilesModal
}

const mock_files = [
  {
    file_path: '/abs/path/packages/ui/src/components/Button.tsx',
    relative_path: 'packages/ui/src/components/Button.tsx',
    token_count: 1200
  },
  {
    file_path: '/abs/path/packages/ui/src/components/Modal.tsx',
    relative_path: 'packages/ui/src/components/Modal.tsx',
    token_count: 550
  },
  {
    file_path: '/abs/path/README.md',
    relative_path: 'README.md',
    token_count: 2100
  }
]

export const Default = () => {
  const [visible, set_visible] = useState(true)

  const handle_accept = (files: string[]) => {
    alert(`Accepted ${files.length} files:\n${files.join('\n')}`)
    set_visible(false)
  }

  const handle_cancel = () => {
    set_visible(false)
  }

  const handle_go_to_file = (file: string) => {
    alert(`Go to file: ${file}`)
  }

  return visible ? (
    <RelevantFilesModal
      files={mock_files}
      on_accept={handle_accept}
      on_cancel={handle_cancel}
      on_go_to_file={handle_go_to_file}
    />
  ) : null
}
