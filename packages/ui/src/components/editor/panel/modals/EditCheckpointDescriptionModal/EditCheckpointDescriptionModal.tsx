import { useState } from 'react'
import { Button } from '../../../common/Button'
import { Modal } from '../Modal'
import { Textarea } from '../../../common/Textarea'

type Props = {
  description: string
  on_save: (description: string) => void
  on_cancel: () => void
}

export const EditCheckpointDescriptionModal: React.FC<Props> = (props) => {
  const [description, set_description] = useState(props.description)

  return (
    <Modal
      title="Edit Description"
      content_slot={
        <Textarea
          value={description}
          on_change={set_description}
          min_rows={2}
          autofocus
          on_key_down={(e) => {
            if (e.key == 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              props.on_save(description)
            }
          }}
        />
      }
      footer_slot={
        <>
          <Button on_click={props.on_cancel} is_secondary={true}>
            Cancel
          </Button>
          <Button on_click={() => props.on_save(description)}>Save</Button>
        </>
      }
    />
  )
}
