import { RecentDonations as UiRecentDonations } from '@ui/components/editor/RecentDonations'
import styles from './Donations.module.scss'
import { Separator as UiSeparator } from '@ui/components/editor/Separator'
import { BuyMeACoffee as UiBuyMeACoffee } from '@ui/components/editor/BuyMeACoffee'
import { useEffect } from 'react'
import { use_donations } from './hooks/use-donations'
import { use_infinite_scroll } from './hooks/use-infinite-scroll'

type Props = {
  vscode: any
  is_visible: boolean
}

export const Donations: React.FC<Props> = (props) => {
  const {
    donations,
    is_loading,
    is_loading_more,
    is_initialized,
    error,
    has_more,
    load_more
  } = use_donations(props.is_visible)

  const container_ref = use_infinite_scroll({
    load_more,
    has_more,
    is_loading: is_loading_more
  })

  useEffect(() => {
    if (container_ref.current) {
      container_ref.current.scrollTop = 0
    }
  }, [props.is_visible])

  return (
    <div
      ref={container_ref}
      className={styles.container}
      style={{ display: !props.is_visible ? 'none' : undefined }}
    >
      <span>
        {
          'CWC is a work of an independent developer aimed at making cost effective, top-accuracy AI coding tools freely available to everyone.'
        }
      </span>

      <UiSeparator size="large" />

      <UiBuyMeACoffee username="robertpiosik" />

      <UiSeparator size="large" />

      {!is_initialized ? (
        <>Fetching recent donations...</>
      ) : error ? (
        error
      ) : (
        <div className={is_loading ? styles.dimmed : undefined}>
          <UiRecentDonations donations={donations} />
          {is_loading_more && (
            <div style={{ textAlign: 'center', padding: '1rem' }}>
              Loading more donations...
            </div>
          )}
          {!has_more && donations.length > 0 && (
            <div style={{ textAlign: 'center', padding: '1rem', opacity: 0.7 }}>
              No more donations to load
            </div>
          )}
        </div>
      )}
    </div>
  )
}
