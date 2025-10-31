import { useState } from 'react'
import { ResponsePreview } from './ResponsePreview'

export default {
  component: ResponsePreview
}

const base_files = [
  {
    file_path: 'src/components/Button/Button.tsx',
    lines_added: 10,
    lines_removed: 2
  },
  {
    file_path: 'src/components/Input/Input.module.scss',
    lines_added: 5,
    lines_removed: 5
  },
  {
    file_path: 'src/utils/helpers.ts',
    lines_added: 20,
    lines_removed: 0
  }
]

const files_using_fallbacks = [
  {
    file_path: 'src/new-feature.ts',
    is_new: true,
    lines_added: 50,
    lines_removed: 0
  },
  {
    file_path: 'src/old-component.tsx',
    is_deleted: true,
    lines_added: 0,
    lines_removed: 100
  },
  {
    file_path: 'src/complex-logic.js',
    is_fallback: true,
    diff_fallback_method: 'recount',
    lines_added: 15,
    lines_removed: 12
  },
  {
    file_path: 'src/aggressive-fallback.css',
    is_fallback: true,
    diff_fallback_method: 'search_and_replace',
    lines_added: 8,
    lines_removed: 3
  }
]

const log_action =
  (action: string) =>
  (...args: any[]) => {
    console.log(action, ...args)
  }

const InteractiveResponsePreview = (props: any) => {
  const [files, set_files] = useState(
    props.files.map((f: any) => ({ ...f, is_checked: true }))
  )

  const handle_toggle_file = ({
    file_path,
    workspace_name,
    is_checked
  }: {
    file_path: string
    workspace_name?: string
    is_checked: boolean
  }) => {
    set_files(
      files.map((f: any) =>
        f.file_path === file_path && f.workspace_name === workspace_name
          ? { ...f, is_checked }
          : f
      )
    )
    log_action('on_toggle_file')({ file_path, workspace_name, is_checked })
  }

  return (
    <ResponsePreview
      {...props}
      files={files}
      on_toggle_file={handle_toggle_file}
      on_discard={log_action('on_undo')}
      on_approve={log_action('on_keep')}
      on_focus_file={log_action('on_focus_file')}
      on_go_to_file={log_action('on_go_to_file')}
      on_intelligent_update={log_action('on_intelligent_update')}
    />
  )
}

export const Default = () => <InteractiveResponsePreview files={base_files} />

export const WithSingleFile = () => (
  <InteractiveResponsePreview files={[base_files[0]]} />
)

export const WithFallbacks = () => (
  <InteractiveResponsePreview
    files={[...base_files, ...files_using_fallbacks]}
  />
)

export const WithMultipleWorkspaces = () => (
  <InteractiveResponsePreview
    files={[
      {
        ...base_files[0],
        workspace_name: 'project-a'
      },
      {
        ...base_files[1],
        workspace_name: 'project-b'
      },
      {
        ...base_files[2],
        workspace_name: 'project-a'
      }
    ]}
    has_multiple_workspaces={true}
  />
)
