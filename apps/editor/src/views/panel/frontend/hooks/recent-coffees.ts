import { useCallback, useEffect, useState, useRef } from 'react'
import axios from 'axios'

type Coffee = {
  support_message: string
  support_note: string
}

export const use_recent_coffees = () => {
  const [viewing_coffees, set_viewing_coffees] = useState(false)
  const [coffees, set_coffees] = useState<Coffee[]>([])
  const [is_fetching, set_is_fetching] = useState(false)
  const [is_revalidating, set_is_revalidating] = useState(false)
  const [fetched_once, set_fetched_once] = useState(false)
  const [page, set_page] = useState(1)
  const [is_fetching_next, set_is_fetching_next] = useState(false)
  const [has_more, set_has_more] = useState(true)
  const cached_coffees = useRef<Coffee[]>([])

  const fetch_coffees = useCallback(async (is_revalidation = false) => {
    try {
      if (is_revalidation) {
        set_is_revalidating(true)
      } else {
        set_is_fetching(true)
      }

      const response = await axios.get(
        'https://app.buymeacoffee.com/api/creators/slug/robertpiosik/coffees?web=1&page=1&per_page=10'
      )

      if (response.data?.data) {
        const new_coffees = response.data.data.map((raw: any) => ({
          support_message: raw.support_message,
          support_note: raw.support_note ?? ''
        }))

        set_coffees(new_coffees)
        cached_coffees.current = new_coffees
        set_page(2)

        if (new_coffees.length < 10) {
          set_has_more(false)
        } else {
          set_has_more(true)
        }
      }
    } catch (error) {
      console.error('Failed to fetch coffees', error)
    } finally {
      if (is_revalidation) {
        set_is_revalidating(false)
      } else {
        set_is_fetching(false)
        set_fetched_once(true)
      }
    }
  }, [])

  useEffect(() => {
    if (!viewing_coffees) {
      set_page(1)
      set_has_more(true)
      return
    }

    // Stale-while-revalidate strategy
    if (fetched_once && cached_coffees.current.length > 0) {
      // Show stale data immediately
      set_coffees(cached_coffees.current)
      // Then revalidate in background
      fetch_coffees(true)
    } else {
      // First time fetch
      fetch_coffees(false)
    }
  }, [viewing_coffees, fetch_coffees])

  const on_fetch_next_page = useCallback(async () => {
    if (
      is_fetching_next ||
      !has_more ||
      is_fetching ||
      is_revalidating ||
      !fetched_once
    ) {
      return
    }
    set_is_fetching_next(true)
    try {
      const response = await axios.get(
        `https://app.buymeacoffee.com/api/creators/slug/robertpiosik/coffees?web=1&page=${page}&per_page=10`
      )
      if (response.data?.data) {
        const new_coffees = response.data.data.map((raw: any) => ({
          support_message: raw.support_message,
          support_note: raw.support_note ?? ''
        }))
        if (new_coffees.length > 0) {
          set_coffees((prev) => {
            const updated = [...prev, ...new_coffees]
            cached_coffees.current = updated
            return updated
          })
          set_page((prev) => prev + 1)
        }
        if (new_coffees.length < 10) {
          set_has_more(false)
        }
      } else {
        set_has_more(false)
      }
    } catch (error) {
      console.error('Failed to fetch coffees', error)
      set_has_more(false)
    } finally {
      set_is_fetching_next(false)
    }
  }, [
    is_fetching_next,
    has_more,
    page,
    is_fetching,
    is_revalidating,
    fetched_once
  ])

  return {
    viewing_coffees,
    set_viewing_coffees,
    coffees,
    is_fetching,
    is_revalidating,
    coffees_fetched_once: fetched_once,
    on_fetch_next_page,
    has_more
  }
}
