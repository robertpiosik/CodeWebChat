import React, { useState } from 'react'
import styles from './ForwardedPorts.module.scss'
import { Group } from '../Group/Group'
import { Item } from '../Item'
import { Input } from '../../common/Input'
import { Button } from '../../common/Button'
import { IconButton } from '../../common/IconButton'

export namespace ForwardedPorts {
  export type Translations = {
    title: string
    item_title: string
    item_description: string
    placeholder: string
    add: string
    delete: string
    expand: string
    collapse: string
  }

  export type Props = {
    forwarded_ports: number[]
    on_update: (ports: number[]) => void
    translations: Translations
  }
}

export const ForwardedPorts: React.FC<ForwardedPorts.Props> = (props) => {
  const [new_port_str, set_new_port_str] = useState('')

  const parsed_port = parseInt(new_port_str, 10)
  const is_valid_port =
    !isNaN(parsed_port) &&
    parsed_port >= 1 &&
    parsed_port <= 65535 &&
    !props.forwarded_ports.includes(parsed_port)

  const handle_add_port = () => {
    if (!is_valid_port) return
    props.on_update([...props.forwarded_ports, parsed_port])
    set_new_port_str('')
  }

  const handle_delete_port = (port: number) => {
    props.on_update(props.forwarded_ports.filter((p) => p !== port))
  }

  return (
    <Group title={props.translations.title}>
      <Item
        title={props.translations.item_title}
        description={props.translations.item_description}
        is_toggleable
        translations={{
          expand: props.translations.expand,
          collapse: props.translations.collapse
        }}
      >
        <div className={styles.container}>
          <div className={styles.row}>
            <Input
              type="number"
              value={new_port_str}
              on_change={set_new_port_str}
              on_key_down={(e) => {
                if (e.key === 'Enter') handle_add_port()
              }}
              placeholder={props.translations.placeholder}
              min={1}
              max={65535}
            />
            <Button on_click={handle_add_port} disabled={!is_valid_port}>
              {props.translations.add}
            </Button>
          </div>
          {props.forwarded_ports.length > 0 && (
            <div className={styles.ports}>
              {props.forwarded_ports.map((port) => (
                <div key={port} className={styles.port}>
                  <span>{port}</span>
                  <IconButton
                    codicon_icon="close"
                    title={props.translations.delete}
                    on_click={() => handle_delete_port(port)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </Item>
    </Group>
  )
}