import React, { useState, useEffect } from 'react'
import styles from './EditPresetForm.module.scss'
import { Presets } from '../Presets'

type Props = {
  preset: Presets.Preset
  on_update: (updated_preset: Presets.Preset) => void
}

export const EditPresetForm: React.FC<Props> = (props) => {
  const [name, set_name] = useState(props.preset.name)

  useEffect(() => {
    props.on_update({
      ...props.preset,
      name
    })
  }, [name])

  return (
    <div className={styles.form}>
      <div className={styles.field}>
        <label htmlFor="preset-name" className={styles.label}>
          Preset Name
        </label>
        <input
          id="preset-name"
          type="text"
          value={name}
          onChange={(e) => set_name(e.target.value)}
          className={styles.input}
        />
      </div>
    </div>
  )
}
