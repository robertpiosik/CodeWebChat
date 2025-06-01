import React from 'react'
import styles from './Switch.module.scss'
import cn from 'classnames'

type Props<T extends string> = {
  value: T
  onChange: (value: T) => void
  options: T[]
}

export const Switch = <T extends string>({
  value,
  onChange,
  options
}: Props<T>) => {
  return (
    <div className={styles.container}>
      {options.map((option) => (
        <div
          key={option}
          className={cn(styles.option, {
            [styles['option--active']]: value === option
          })}
          onClick={() => onChange(option)}
          data-text={option}
        >
          {option}
        </div>
      ))}
    </div>
  )
}
