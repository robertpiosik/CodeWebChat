import { useState, useEffect, useCallback, useRef } from 'react'
import { Logger } from '@/utils/logger'

type Donation = {
  name: string
  date: Date
  note?: string
  is_monthly?: boolean
}

type BuyMeACoffeeDonationsResponse = {
  data: {
    supporter_name: string
    support_created_on: string
    support_note: string | undefined
    support_type: 'Supporter' | 'Monthly Supporter'
  }[]
}

export const use_donations = (is_visible: boolean) => {
  const [donations, set_donations] = useState<Donation[]>([])
  const [is_loading, set_is_loading] = useState(false)
  const [is_loading_more, set_is_loading_more] = useState(false)
  const [error, set_error] = useState<string | null>(null)
  const [current_page, set_current_page] = useState(1)
  const [has_more, set_has_more] = useState(true)
  const [is_initialized, set_is_initialized] = useState(false)
  const prev_is_visible = useRef(is_visible)

  const fetch_donations_page = async (page: number, append = false) => {
    const response = await fetch(
      `https://app.buymeacoffee.com/api/creators/slug/robertpiosik/coffees?page=${page}&per_page=10`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch donations')
    }

    const data: BuyMeACoffeeDonationsResponse = await response.json()
    const new_donations = data.data.map((coffee: any) => ({
      name: coffee.supporter_name,
      date: new Date(coffee.support_created_on),
      note: coffee.support_note,
      is_monthly: coffee.support_type == 'Monthly Supporter'
    }))

    if (append) {
      set_donations((prev) => [...prev, ...new_donations])
    } else {
      set_donations(new_donations)
    }

    set_has_more(new_donations.length === 10)
    return new_donations.length
  }

  const fetch_initial_data = async () => {
    set_is_loading(true)
    set_error(null)
    set_current_page(1)
    set_has_more(true)

    try {
      await fetch_donations_page(1, false)
    } catch (err) {
      set_error('Failed to fetch recent donations. Please try again later.')
      Logger.error({
        function_name: 'fetch_initial_data',
        message: 'Error fetching data:',
        data: err
      })
    } finally {
      set_is_loading(false)
      set_is_initialized(true)
    }
  }

  const load_more = useCallback(async () => {
    if (!has_more || is_loading_more || is_loading) return

    set_is_loading_more(true)
    set_error(null)

    try {
      const next_page = current_page + 1
      const count = await fetch_donations_page(next_page, true)
      set_current_page(next_page)

      if (count < 10) {
        set_has_more(false)
      }
    } catch (err) {
      set_error('Failed to load more donations.')
      Logger.error({
        function_name: 'load_more',
        message: 'Error loading more donations:',
        data: err
      })
    } finally {
      set_is_loading_more(false)
    }
  }, [current_page, has_more, is_loading_more, is_loading])

  useEffect(() => {
    // Initial load when first becoming visible
    if (is_visible && !is_initialized && !is_loading) {
      fetch_initial_data()
    }
    // Refresh when becoming visible again (was false, now true)
    else if (
      is_visible &&
      !prev_is_visible.current &&
      is_initialized &&
      !is_loading
    ) {
      fetch_initial_data()
    }

    prev_is_visible.current = is_visible
  }, [is_visible, is_initialized, is_loading])

  return {
    donations,
    is_loading,
    is_loading_more,
    is_initialized,
    error,
    has_more,
    load_more
  }
}
