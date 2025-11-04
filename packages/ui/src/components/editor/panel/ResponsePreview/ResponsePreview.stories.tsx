import { useState } from 'react'
import { ResponsePreview } from './ResponsePreview'
import { ItemInPreview } from '@shared/types/file-in-preview'

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
  const [items, set_items] = useState(
    props.items.map((f: any) =>
      'file_path' in f ? { ...f, is_checked: true } : f
    )
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
    set_items(
      items.map((f: any) =>
        'file_path' in f &&
        f.file_path === file_path &&
        f.workspace_name === workspace_name
          ? { ...f, is_checked }
          : f
      )
    )
    log_action('on_toggle_file')({ file_path, workspace_name, is_checked })
  }

  return (
    <ResponsePreview
      {...props}
      items={items}
      on_toggle_file={handle_toggle_file}
      on_focus_file={log_action('on_focus_file')}
      on_go_to_file={log_action('on_go_to_file')}
      on_intelligent_update={log_action('on_intelligent_update')}
    />
  )
}

export const Default = () => <InteractiveResponsePreview items={base_files} />

export const WithSingleFile = () => (
  <InteractiveResponsePreview items={[base_files[0]]} />
)

export const WithFallbacks = () => (
  <InteractiveResponsePreview
    items={[...base_files, ...files_using_fallbacks]}
  />
)

export const WithMultipleWorkspaces = () => (
  <InteractiveResponsePreview
    items={[
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

export const WithText = () => (
  <InteractiveResponsePreview
    items={[
      { type: 'text', content: 'This is a text item.' },
      ...base_files,
      {
        type: 'text',
        content:
          'Another text item explaining something with **markdown**.\n\n*   List item 1\n*   List item 2\n\n`some code here`'
      },
      ...files_using_fallbacks
    ]}
  />
)

export const WithShortInstructions = () => (
  <InteractiveResponsePreview
    items={base_files}
    raw_instructions="This is a short instruction."
  />
)

export const WithMediumInstructions = () => (
  <InteractiveResponsePreview
    items={base_files}
    raw_instructions="This is a medium length instruction, it should have the default font size and it's here to demonstrate the behavior."
  />
)

export const WithLongInstructions = () => (
  <InteractiveResponsePreview
    items={base_files}
    raw_instructions="This is a very long instruction, it is designed to be very long to test the small font size. It should wrap and clamp to three lines. We need to make sure this text is long enough to trigger the smaller font size. This should be more than 160 characters for sure."
  />
)
