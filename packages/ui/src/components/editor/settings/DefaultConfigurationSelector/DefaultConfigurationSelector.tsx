import React from 'react'
import styles from './DefaultConfigurationSelector.module.scss'
import { TextButton } from '../TextButton'
import { Item } from '../Item'

export namespace DefaultConfigurationSelector {
  export type Configuration = {
    id: string
    model: string
    description: string
  }

  export type Translations = {
    select: string
    unset: string
  }

  export type Props = {
    title: string
    value: string | null
    configurations: Configuration[]
    on_unset: () => void
    on_select: () => void
    translations: Translations
  }
}

export const DefaultConfigurationSelector: React.FC<
  DefaultConfigurationSelector.Props
> = (props) => {
  const selected_config = props.configurations.find((c) => c.id === props.value)

  if (!selected_config) {
    return (
      <Item
        title={props.title}
        slot_right={
          <TextButton on_click={props.on_select}>
            {props.translations.select}
          </TextButton>
        }
      />
    )
  }

  return (
    <Item
      title={props.title}
      description={
        <div className={styles.info}>
          <span className={styles.model}>{selected_config.model}</span>
          <span className={styles.description}>
            {selected_config.description}
          </span>
        </div>
      }
      slot_right={
        <TextButton on_click={props.on_unset}>
          {props.translations.unset}
        </TextButton>
      }
    />
  )
}

