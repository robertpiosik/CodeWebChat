import styles from './Donations.module.scss'
import { IconButton } from '../IconButton/IconButton'

type Donation = {
  supporter_name: string
  support_coffees: number
  support_note: string
}

export type DonationsProps = {
  donations?: Donation[]
  is_fetching?: boolean
  are_donations_visible: boolean
  donations_fetched_once: boolean
  on_toggle_donations_visibility: () => void
}

export const Donations: React.FC<DonationsProps> = (props) => {
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
            props.donations?.map((donation, index) => (
              <div className={styles.container__donation} key={index}>
                <div
                  className={styles.container__donation__header}
                  title={`${donation.supporter_name} bought ${Math.ceil(
                    donation.support_coffees
                  )} coffee${donation.support_coffees > 1 ? 's' : ''}`}
                >
                  <strong>{donation.supporter_name}</strong> bought{' '}
                  {Math.ceil(donation.support_coffees)} coffee
                  {donation.support_coffees > 1 && 's'}
                </div>
                {donation.support_note && (
                  <div className={styles.container__donation__note}>
                    {donation.support_note}
                  </div>
                )}
              </div>
            ))
          )}
        </>
      )}
    </div>
  )
}
