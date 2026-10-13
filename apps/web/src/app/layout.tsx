import { ReactNode } from 'react'
import { get_dictionary } from './get_dictionary'

const Layout: React.FC<{ children: ReactNode }> = async ({ children }) => {
  // Set the lang attribute dynamically on the html tag for accessibility
  const dictionary = await get_dictionary()

  return (
    <html lang={dictionary.locale}>
      <head>
        <title>CodeWebChat</title>
      </head>
      <body style={{ fontFamily: 'sans-serif', margin: '2rem' }}>
        {children}
      </body>
    </html>
  )
}

export default Layout
