import { FC } from 'react'
import { Checkbox } from '../../common/Checkbox'
import styles from './TokenCounts.module.scss'

type Props = {
  token_count: {
    selected_files: string
    prompt: string
  }
  include_selected_files: boolean
  on_toggle_include_selected_files: (include: boolean) => void
  translations: {
    selected_files: string
    prompt: string
  }
}

export const TokenCounts: FC<Props> = (props) => {
  return (
    <div className={styles.container}>
      <div className={styles.item}>
        <Checkbox
          checked={props.include_selected_files}
          on_change={props.on_toggle_include_selected_files}
        />
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
