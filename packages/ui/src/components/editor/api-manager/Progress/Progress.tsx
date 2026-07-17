import { use_progress_times } from '../../../../hooks/use-progress-times'
import styles from './Progress.module.scss'

type Props = {
  progress_items: {
    id: string
    title: string
    tokens_per_second?: number
    total_tokens?: number
    provider_name: string
    model?: string
    reasoning_effort?: string
  }[]
  on_cancel: (id: string) => void
}

const format_tokens = (tokens: number): string => {
  const rounded = Math.round(tokens)
  if (rounded >= 1000) {
    return `${(rounded / 1000).toFixed(1)}k`
  }
  return rounded.toString()
}

export const Progress: React.FC<Props> = (props) => {
  const { start_times, now } = use_progress_times(props.progress_items)

  return (
    <div
      className={styles.overlay}
      onKeyDown={(e) => {
        if (e.key == 'Escape') {
          e.stopPropagation()
        }
      }}
    >
      <div className={styles.container}>
        <div className={styles['requests-container']}>
          {props.progress_items.map((item) => {
            const item_start_time = start_times[item.id]
            const current_start_time = item_start_time || Date.now()
            const elapsed_ms = now - current_start_time

            const description_parts = [item.provider_name]
            if (item.reasoning_effort) {
              description_parts.push(item.reasoning_effort)
            }
            const description = description_parts.join(' · ')

            return (
              <div key={item.id} className={styles.item}>
                <div className={styles.item__top}>
                  <div className={styles.item__top__left}>
                    <span>{item.model}</span>
                    <span>{description}</span>
                  </div>
                  <div className={styles.item__close}>
                    <button
                      className={styles.item__close__button}
                      onClick={() => props.on_cancel(item.id)}
                    />
                  </div>
                </div>
                <div className={styles.item__bottom}>
                  <div className={styles.item__bottom__status}>
                    {item.title}
                  </div>
                  <div className={styles.item__bottom__right}>
                    {item.tokens_per_second !== undefined && (
                      <div>
                        {format_tokens(item.tokens_per_second)} tokens/s
                      </div>
                    )}
                    {item.total_tokens !== undefined && (
                      <div>({format_tokens(item.total_tokens)})</div>
                    )}
                    <div>{(elapsed_ms / 1000).toFixed(1)}s</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
