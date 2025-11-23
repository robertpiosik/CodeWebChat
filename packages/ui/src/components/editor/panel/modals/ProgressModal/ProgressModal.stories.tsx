import { useState, useEffect } from 'react'
import { ProgressModal, FileProgress } from './ProgressModal'

export default {
  component: ProgressModal
}

export const Indeterminate = () => {
  const [visible, set_visible] = useState(true)

  const handleCancel = () => {
    set_visible(false)
  }

  return visible ? (
    <ProgressModal title="Processing…" on_cancel={handleCancel} />
  ) : null
}

export const NonCancellable = () => {
  return <ProgressModal title="Restoring checkpoint..." progress={50} />
}

export const WithProgress = () => {
  const [visible, set_visible] = useState(true)
  const [progress, set_progress] = useState(0)

  const handle_cancel = () => {
    set_visible(false)
  }

  // Simulate progress increasing every half‑second
  useEffect(() => {
    const timer = setInterval(() => {
      set_progress((prev) => {
        const next = prev + 10
        if (next >= 100) {
          clearInterval(timer)
          return 100
        }
        return next
      })
    }, 500)

    return () => clearInterval(timer)
  }, [])

  return visible ? (
    <ProgressModal
      title="Receiving..."
      progress={progress}
      tokens_per_second={250}
      on_cancel={handle_cancel}
    />
  ) : null
}

export const WithMultipleFiles = () => {
  const [visible, set_visible] = useState(true)
  const [files, set_files] = useState<FileProgress[]>([
    { file_path: 'src/components/Button.tsx', status: 'waiting' },
    { file_path: 'src/components/Modal.tsx', status: 'waiting' },
    { file_path: 'src/utils/helpers.ts', status: 'waiting' },
    { file_path: 'src/index.ts', status: 'waiting' },
    { file_path: 'src/styles/main.scss', status: 'waiting' }
  ])

  const handle_cancel = () => {
    set_visible(false)
  }

  useEffect(() => {
    const timer = setInterval(() => {
      set_files((prev_files) => {
        const new_files = [...prev_files]

        // Update receiving files first
        let updated = false
        for (let i = 0; i < new_files.length; i++) {
          const file = new_files[i]
          if (file.status == 'receiving' && (file.progress ?? 0) < 100) {
            const new_progress = Math.min((file.progress ?? 0) + 20, 100)
            new_files[i] =
              new_progress == 100
                ? { ...file, status: 'done', progress: 100 }
                : { ...file, progress: new_progress }
            updated = true
          }
        }
        if (updated) return new_files

        // Transition a thinking file to receiving
        const thinking_index = new_files.findIndex(
          (f) => f.status == 'thinking'
        )
        if (thinking_index != -1) {
          new_files[thinking_index] = {
            ...new_files[thinking_index],
            status: 'receiving',
            progress: 0,
            tokens_per_second: Math.round(Math.random() * 200 + 100)
          }
          return new_files
        }

        // Transition a waiting file to thinking
        const waiting_index = new_files.findIndex((f) => f.status == 'waiting')
        if (waiting_index != -1) {
          new_files[waiting_index] = {
            ...new_files[waiting_index],
            status: 'thinking'
          }
          return new_files
        }

        if (new_files.every((f) => f.status == 'done')) {
          clearInterval(timer)
        }

        return new_files
      })
    }, 700)

    return () => clearInterval(timer)
  }, [])

  return visible ? (
    <ProgressModal
      title="Intelligent Update..."
      files={files}
      on_cancel={handle_cancel}
    />
  ) : null
}
