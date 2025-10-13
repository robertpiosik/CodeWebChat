import styles from './Separator.module.scss'
import cn from 'classnames'

export namespace Separator {
  export type Props = {
    height: 8 | 10 | 12 | 14 | 16 | 24
  }
}

export const Separator: React.FC<Separator.Props> = (props) => {
  return (
    <div
      className={cn(styles.separator, styles[`separator--${props.height}`])}
    />
  )
}
