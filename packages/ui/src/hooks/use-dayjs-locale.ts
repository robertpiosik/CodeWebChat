import { useEffect } from 'react'
import dayjs from 'dayjs'

export const use_dayjs_locale = () => {
  useEffect(() => {
    const lang = document.documentElement.lang || 'en'
    if (lang != 'en') {
      import(/* webpackInclude: /\.js$/ */ `dayjs/locale/${lang}`)
        .then(() => {
          dayjs.locale(lang)
        })
        .catch(() => {
          dayjs.locale('en')
        })
    } else {
      dayjs.locale('en')
    }
  }, [])
}
