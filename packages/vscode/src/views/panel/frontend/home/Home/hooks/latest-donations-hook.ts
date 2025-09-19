import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'

type Donation = {
  support_message: string
  support_note: string
}

export const use_latest_donations = (
  is_active: boolean,
  are_donations_visible: boolean
) => {
  const [donations, set_donations] = useState<Donation[]>([])
  const [is_fetching, set_is_fetching] = useState(true)
  const [fetched_once, set_fetched_once] = useState(false)
  const [page, set_page] = useState(1)
  const [is_fetching_next, set_is_fetching_next] = useState(false)
  const [has_more, set_has_more] = useState(true)

  useEffect(() => {
    if (!are_donations_visible) {
      set_donations([])
      set_page(1)
      set_fetched_once(false)
      set_has_more(true)
      return
    }

    if (!is_active || fetched_once) return

    set_is_fetching(true)
    const fetch_donations = async () => {
      try {
        const response = await axios.get(
          'https://app.buymeacoffee.com/api/creators/slug/robertpiosik/coffees?web=1&page=1&per_page=10'
        )
        if (response.data?.data) {
          const new_donations = response.data.data.map((raw: any) => ({
            support_message: raw.support_message,
            support_note: raw.support_note ?? ''
          }))
          set_donations(new_donations)
          set_page(2)
          if (new_donations.length < 10) {
            set_has_more(false)
          }
        }
      } catch (error) {
        console.error('Failed to fetch donations', error)
      } finally {
        set_is_fetching(false)
        set_fetched_once(true)
      }
    }
    fetch_donations()
  }, [is_active, are_donations_visible, fetched_once])

  const on_fetch_next_page = useCallback(async () => {
    if (is_fetching_next || !has_more) {
      return
    }
    set_is_fetching_next(true)
    try {
      const response = await axios.get(
        `https://app.buymeacoffee.com/api/creators/slug/robertpiosik/coffees?web=1&page=${page}&per_page=10`
      )
      if (response.data?.data) {
        const new_donations = response.data.data.map((raw: any) => ({
          support_message: raw.support_message,
          support_note: raw.support_note ?? ''
        }))
        if (new_donations.length > 0) {
          set_donations((prev) => [...prev, ...new_donations])
          set_page((prev) => prev + 1)
        }
        if (new_donations.length < 10) {
          set_has_more(false)
        }
      } else {
        set_has_more(false)
      }
    } catch (error) {
      console.error('Failed to fetch donations', error)
      set_has_more(false)
    } finally {
      set_is_fetching_next(false)
    }
  }, [is_fetching_next, has_more, page])

  return {
    donations,
    is_fetching,
    donations_fetched_once: fetched_once,
    on_fetch_next_page,
    has_more
  }
}

export const use_latest_donation = use_latest_donations
