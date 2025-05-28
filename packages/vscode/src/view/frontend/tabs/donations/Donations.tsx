import { RecentCoffees } from '@ui/components/editor/RecentCoffees'
import styles from './Donations.module.scss'
import { Separator } from '@ui/components/editor/Separator'
import { BuyMeACoffee } from '@ui/components/editor/BuyMeACoffee'
import { useEffect, useState } from 'react'
import { Logger } from '@/helpers/logger'
import cn from 'classnames'

type Props = {
  vscode: any
  is_visible: boolean
}

export const Donations: React.FC<Props> = (props) => {
  const [coffees, set_coffees] = useState<{ name: string; note?: string }[]>([])
  const [is_loading, set_is_loading] = useState(false)
  const [error, set_error] = useState<string | null>(null)

  useEffect(() => {
    if (props.is_visible && !is_loading) {
      fetch_donations()
    }
  }, [props.is_visible])

  const fetch_donations = async () => {
    set_is_loading(true)
    set_error(null)
    try {
      const response = await fetch(
        'https://app.buymeacoffee.com/api/creators/slug/robertpiosik/coffees?page=1&per_page=20'
      )
      if (!response.ok) {
        throw new Error('Failed to fetch donations')
      }
      const data = await response.json()
      set_coffees(
        data.data.map((coffee: any) => ({
          name: coffee.supporter_name,
          note: coffee.support_note
        }))
      )
    } catch (err) {
      set_error('Failed to fetch donations. Please try again later.')
      Logger.error({
        function_name: 'fetch_donations',
        message: 'Error fetching donations:',
        data: err
      })
    } finally {
      set_is_loading(false)
    }
  }

  return (
    <div
      className={styles.container}
      style={{ display: !props.is_visible ? 'none' : undefined }}
    >
      CWC is a work of an independent developer aimed at making AI-assisted
      software development freely accessible to everyone.
      <Separator size="large" />
      <BuyMeACoffee username="robertpiosik" />
      <Separator size="large" />
      {is_loading && !coffees.length ? (
        <>Fetching donations...</>
      ) : error ? (
        <>{error}</>
      ) : (
        <div
          className={cn(styles['recent-donations'], {
            [styles['recent-donations--loading']]: is_loading
          })}
        >
          <RecentCoffees coffees={coffees} />
        </div>
      )}
    </div>
  )
}
