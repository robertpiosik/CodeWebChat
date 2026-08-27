import { FC } from 'react'
import { Checkbox } from '../../common/Checkbox'
import styles from './TokenCounts.module.scss'

export namespace TokenCounts {
  export type Props = {
    token_count: {
      selected_files: string
      prompt: string
    }
    translations: {
      selected_files: string
      prompt: string
    }
  }
}

export const TokenCounts: FC<TokenCounts.Props> = (props) => {
  return (
    <div className={styles.container}>
      <div className={styles.item}>
        <Checkbox checked={true} on_change={() => {}} disabled />
        <div className={styles.item__label}>
          <span className={styles.item__label__text}>
            {props.translations.selected_files}:{' '}
          </span>
          <span className={styles.item__label__count}>
            {props.token_count.selected_files}
          </span>
        </div>
      </div>

      <div className={styles.item}>
        <div className={styles.item__label}>
          <span className={styles.item__label__text}>
            {props.translations.prompt}:{' '}
          </span>
          <span className={styles.item__label__count}>
            {props.token_count.prompt}
          </span>
        </div>
      </div>
    </div>
  )
}
