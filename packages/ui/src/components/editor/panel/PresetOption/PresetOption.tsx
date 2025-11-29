import { FC } from 'react'
import { Checkbox } from '../../common/Checkbox'
import styles from './PresetOption.module.scss'

type Props = {
  label: string
  checked: boolean
  on_change: (checked: boolean) => void
  disabled?: boolean
  title?: string
  disabled_reason?: string
}

export const PresetOption: FC<Props> = ({
  label,
  checked,
  on_change,
  disabled,
  title,
  disabled_reason
}) => {
  return (
    <div>
      <label
        className={`${styles.option} ${disabled ? styles.disabled : ''}`}
        title={title}
      >
        <Checkbox
          checked={checked}
          on_change={on_change}
          disabled={disabled}
        />
        <span>{label}</span>
      </label>
      {disabled && disabled_reason && (
        <div className={styles.disabled_reason}>{disabled_reason}</div>
      )}
    </div>
  )
}