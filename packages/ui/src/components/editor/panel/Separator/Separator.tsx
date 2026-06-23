import styles from './Separator.module.scss'

export namespace Separator {
  export type Props = {
    height: number
  }
}

export const Separator: React.FC<Separator.Props> = (props) => {
  return (
    <div
      className={styles.separator}
      style={{ height: `${props.height}px` }}
    />
  )
}
