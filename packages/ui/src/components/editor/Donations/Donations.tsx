import styles from './Donations.module.scss'
import { IconButton } from '../IconButton/IconButton'
import { useEffect, useRef } from 'react'

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
  are_donations_visible: boolean
  donations_fetched_once: boolean
  on_toggle_donations_visibility: () => void
  on_fetch_next_page: () => void
  has_more?: boolean
}

export const Donations: React.FC<DonationsProps> = (props) => {
  const observer_target = useRef<HTMLDivElement>(null)

  const get_icon = () => {
    if (!props.donations_fetched_once && !props.are_donations_visible) {
      return 'cloud-download'
    }
    return props.are_donations_visible ? 'eye' : 'eye-closed'
  }

  const get_title = () => {
    if (!props.donations_fetched_once && !props.are_donations_visible) {
      return 'Fetch donations'
    }
    return props.are_donations_visible ? 'Hide donations' : 'Show donations'
  }

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
    <div className={styles.container}>
      <div className={styles.container__heading_container}>
        <div className={styles.container__heading}>RECENT DONATIONS</div>
        <IconButton
          codicon_icon={get_icon()}
          on_click={props.on_toggle_donations_visibility}
          title={get_title()}
        />
      </div>
      {props.are_donations_visible && (
        <>
          {props.is_fetching ? (
            <>
              <div className={styles.container__donation}>
                <div
                  className={styles.skeleton}
                  style={{ width: '50%', height: '14px' }}
                />
                <div className={styles.skeleton} style={{ height: '30px' }} />
              </div>
              <div className={styles.container__donation}>
                <div
                  className={styles.skeleton}
                  style={{ width: '70%', height: '14px' }}
                />
                <div className={styles.skeleton} style={{ height: '30px' }} />
              </div>
              <div className={styles.container__donation}>
                <div
                  className={styles.skeleton}
                  style={{ width: '40%', height: '14px' }}
                />
                <div className={styles.skeleton} style={{ height: '30px' }} />
              </div>
            </>
          ) : (
            <>
              {props.donations?.map((donation, index) => (
                <div className={styles.container__donation} key={index}>
                  {(() => {
                    const { username, href, after_text } =
                      parse_support_message(donation.support_message)
                    const title = `${username} ${after_text}`
                    return (
                      <div
                        className={styles.container__donation__header}
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
                    <div className={styles.container__donation__note}>
                      {donation.support_note}
                    </div>
                  )}
                </div>
              ))}
              {props.has_more && <div ref={observer_target} />}
            </>
          )}
        </>
      )}
    </div>
  )
}
