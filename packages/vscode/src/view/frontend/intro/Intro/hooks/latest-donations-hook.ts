import { useEffect, useState } from 'react'
import axios from 'axios'

export type Donation = {
  supporter_name: string
  support_coffees: number
  support_note: string
}

export const use_latest_donations = (
  is_active: boolean,
  are_donations_visible: boolean
) => {
  const [donations, set_donations] = useState<Donation[]>([])
  const [is_fetching, set_is_fetching] = useState(true)
  const [fetched_once, set_fetched_once] = useState(false)

  useEffect(() => {
    if (!is_active || !are_donations_visible) return

    if (!fetched_once) {
      set_is_fetching(true)
    }

    const fetch_donations = async () => {
      try {
        const response = await axios.get(
          'https://app.buymeacoffee.com/api/creators/slug/robertpiosik/coffees?web=1&page=1&per_page=10'
        )
        if (response.data?.data) {
          set_donations(
            response.data.data.map((raw: any) => ({
              supporter_name: raw.supporter_name,
              support_coffees: raw.support_coffees,
              support_note: raw.support_note ?? ''
            }))
          )
          set_is_fetching(false)
        }
      } catch (error) {
        console.error('Failed to fetch donations', error)
      } finally {
        set_fetched_once(true)
      }
    }
    fetch_donations()
  }, [is_active, are_donations_visible])

  return {
    donations,
    is_fetching,
    donations_fetched_once: fetched_once
  }
}

export const use_latest_donation = use_latest_donations
