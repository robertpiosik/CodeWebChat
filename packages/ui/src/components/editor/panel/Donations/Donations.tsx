import styles from './Donations.module.scss'
import { useEffect, useRef, useState } from 'react'
import cn from 'classnames'
import { Scrollable } from '../Scrollable'
import { ListHeader } from '../ListHeader/ListHeader'

const get_href_from_url_like_string = (text: string): string | null => {
  if (/\s/.test(text)) {
    return null
  }
  if (text.startsWith('http://') || text.startsWith('https://')) {
    try {
      return new URL(text).href
    } catch {
      return null
    }
  }
  if (text.includes('.') && !text.includes('@')) {
    try {
      return new URL(`https://${text}`).href
    } catch {
      return null
    }
  }
  return null
}

const parse_support_message = (
  message: string
): {
  username: string
  href: string | null
  after_text: string
} => {
  const span_match = message.match(
    /<span class="suppUsername"[^>]*>([\s\S]*?)<\/span>/i
  )

  if (span_match) {
    const span_content = span_match[1].trim()
    const after_text = (message.split('</span>')[1] ?? '').trim()
    const a_match = span_content.match(
      /<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/i
    )

    if (a_match) {
      const href = a_match[1]
      const username = a_match[2]
      return { username, href, after_text }
    } else {
      const username = span_content
      const href = get_href_from_url_like_string(username)
      return { username, href, after_text }
    }
  }

  const bold_match = message.match(/<strong[^>]*>([^<]+)<\/strong>/i)
  if (bold_match) {
    const username = bold_match[1].trim()
    const after_text = (message.split('</strong>')[1] ?? '').trim()
    const href = get_href_from_url_like_string(username)
    return { username, href, after_text }
  }

  // Fallback for when no tags are found
  const username = message.trim()
  const href = get_href_from_url_like_string(username)
  return { username: href ? username : message, href, after_text: '' }
}

type Donation = {
  support_message: string
  support_note: string
}

export type DonationsProps = {
  donations?: Donation[]
  is_fetching?: boolean
  is_revalidating?: boolean
  on_fetch_next_page: () => void
  has_more?: boolean
}

export const Donations: React.FC<DonationsProps> = (props) => {
  const observer_target = useRef<HTMLDivElement>(null)
  const [is_wallets_collapsed, set_is_wallets_collapsed] = useState(true)
  const [is_donations_collapsed, set_is_donations_collapsed] = useState(false)

  useEffect(() => {
    if (!observer_target.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          props.on_fetch_next_page()
        }
      },
      { threshold: 1.0 }
    )

    const target = observer_target.current
    observer.observe(target)

    return () => observer.unobserve(target)
  }, [props.on_fetch_next_page])

  return (
    <Scrollable>
      <div className={styles.container}>
        <ListHeader
          title="Crypto wallets"
          is_collapsed={is_wallets_collapsed}
          on_toggle_collapsed={() => set_is_wallets_collapsed((v) => !v)}
        />
        {!is_wallets_collapsed && (
          <div className={styles.wallets}>
            <div className={styles.wallets__wallet}>
              <strong>Bitcoin</strong>
              <span>bc1qfzajl0fc4347knr6n5hhuk52ufr4sau04su5te</span>
            </div>
            <div className={styles.wallets__wallet}>
              <strong>Ethereum</strong>
              <span>0x532eA8CA70aBfbA6bfE35e6B3b7b301b175Cf86D</span>
            </div>
            <div className={styles.wallets__wallet}>
              <strong>Monero</strong>
              <span>
                84whVjApZJtSeRb2eEbZ1pJ7yuBoGoWHGA4JuiFvdXVBXnaRYyQ3S4kTEuzgKjpxyr3nxn1XHt9yWTRqZ3XGfY35L4yDm6R
              </span>
            </div>
          </div>
        )}
        <ListHeader
          title="Recent coffees"
          is_collapsed={is_donations_collapsed}
          on_toggle_collapsed={() => set_is_donations_collapsed((v) => !v)}
        />
        {!is_donations_collapsed && (
          <div className={styles.donations}>
            {props.is_fetching ? (
              <>
                <div className={styles.donations__inner__donation}>
                  <div
                    className={styles.skeleton}
                    style={{ width: '50%', height: '14px' }}
                  />
                  <div className={styles.skeleton} style={{ height: '30px' }} />
                </div>
                <div className={styles.donations__inner__donation}>
                  <div
                    className={styles.skeleton}
                    style={{ width: '70%', height: '14px' }}
                  />
                  <div className={styles.skeleton} style={{ height: '30px' }} />
                </div>
                <div className={styles.donations__inner__donation}>
                  <div
                    className={styles.skeleton}
                    style={{ width: '40%', height: '14px' }}
                  />
                  <div className={styles.skeleton} style={{ height: '30px' }} />
                </div>
              </>
            ) : (
              <>
                <div
                  className={cn(styles.donations__inner, {
                    [styles['donations__inner--revalidating']]:
                      props.is_revalidating
                  })}
                >
                  {props.donations?.map((donation, index) => (
                    <div
                      className={styles.donations__inner__donation}
                      key={index}
                    >
                      {(() => {
                        const { username, href, after_text } =
                          parse_support_message(donation.support_message)
                        const title = `${username} ${after_text}`
                        return (
                          <div
                            className={
                              styles.donations__inner__donation__header
                            }
                            title={title}
                          >
                            <strong>
                              {href ? (
                                <a href={href} target="_blank" rel="nofollow">
                                  {username}
                                </a>
                              ) : (
                                username
                              )}
                            </strong>{' '}
                            {after_text}
                          </div>
                        )
                      })()}
                      {donation.support_note && (
                        <div
                          className={styles.donations__inner__donation__note}
                        >
                          {donation.support_note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {props.has_more && <div ref={observer_target} />}
              </>
            )}
          </div>
        )}
      </div>
    </Scrollable>
  )
}
