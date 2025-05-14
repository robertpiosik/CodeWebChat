import React from 'react'
import styles from './Providers.module.scss'
import { PROVIDERS } from '@shared/constants/providers'
import { Button } from '../Button'
import { _ApiKeyField } from './_ApiKeyField'
import { Field } from '../Field'
import { Input } from '../Input'

namespace Providers {
  type BuiltInProvider = {
    type: 'built-in'
    id: keyof typeof PROVIDERS
    api_key: string
  }
  type CustomProvider = {
    type: 'custom'
    name: string
    base_url: string
    api_key: string
  }
  type Provider = BuiltInProvider | CustomProvider

  export type Props = {
    providers: Provider[]
    on_providers_updated: (providers: Provider[]) => void
    on_add_provider_click: () => void
  }
}

export const Providers: React.FC<Providers.Props> = (props) => {
  return (
    <div className={styles.container}>
      <div className={styles.providers}>
        {props.providers.map((provider, i) => {
          if (provider.type == 'built-in') {
            return (
              <div key={i}>
                <div>{PROVIDERS[provider.id].display_name}</div>
                <_ApiKeyField
                  value={provider.api_key}
                  on_change={(new_key) => {
                    const updated_providers = props.providers.map((p) => {
                      if (p.type == 'built-in' && p.id == provider.id) {
                        return { ...p, api_key: new_key }
                      }
                      return p
                    })
                    props.on_providers_updated(updated_providers)
                  }}
                />
              </div>
            )
          } else {
            return (
              <div key={i}>
                <Field label="Name">
                  <Input
                    value={provider.name}
                    onChange={(new_name) => {
                      const updated_providers = props.providers.map((p, j) => {
                        if (i == j) {
                          return { ...p, name: new_name }
                        }
                        return p
                      })
                      props.on_providers_updated(updated_providers)
                    }}
                  />
                </Field>
                <Field label="Base URL">
                  <Input
                    value={provider.base_url}
                    onChange={(new_url) => {
                      const updated_providers = props.providers.map((p, j) => {
                        if (i == j) {
                          return { ...p, base_url: new_url }
                        }
                        return p
                      })
                      props.on_providers_updated(updated_providers)
                    }}
                  />
                </Field>
                <Field label="API Key">
                  <_ApiKeyField
                    value={provider.api_key}
                    on_change={(new_key) => {
                      const updated_providers = props.providers.map((p, j) => {
                        if (i == j) {
                          return { ...p, api_key: new_key }
                        }
                        return p
                      })
                      props.on_providers_updated(updated_providers)
                    }}
                  />
                </Field>
                <Button
                  on_click={() => {
                    const updated_providers = props.providers.filter(
                      (_, j) => i !== j
                    )
                    props.on_providers_updated(updated_providers)
                  }}
                >
                  Remove
                </Button>
              </div>
            )
          }
        })}
      </div>

      <Button on_click={props.on_add_provider_click}>Add Provider</Button>
    </div>
  )
}
