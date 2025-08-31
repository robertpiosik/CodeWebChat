import { useEffect, useRef, useState } from 'react'
import axios from 'axios'

type Donation = {
  supporter_name: string
  support_coffees: number
  support_note: string
}

export const use_latest_donation = (is_active: boolean) => {
  const [donation, set_donation] = useState<Donation | null>(null)
  const last_fetched_at = useRef<number | null>(null)

  useEffect(() => {
    if (!is_active) {
      return
    }

    const fetch_donation = async () => {
      if (
        last_fetched_at.current &&
        Date.now() - last_fetched_at.current < 5000
      ) {
        return
      }
      try {
        const response = await axios.get(
          'https://app.buymeacoffee.com/api/creators/slug/robertpiosik/coffees?web=1&page=1&per_page=10'
        )
        last_fetched_at.current = Date.now()
        if (response.data?.data && response.data.data.length > 0) {
          const raw = response.data.data[0]
          set_donation({
            supporter_name: raw.supporter_name,
            support_coffees: raw.support_coffees,
            support_note: raw.support_note ?? ''
          })
        }
      } catch (error) {
        console.error('Failed to fetch latest donation', error)
      }
    }
    fetch_donation()
  }, [is_active])

  return donation
}
