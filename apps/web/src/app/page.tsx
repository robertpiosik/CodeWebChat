import { get_dictionary } from './get_dictionary'

const Page: React.FC = async () => {
  const dictionary = await get_dictionary()

  return (
    <main>
      <h1>{dictionary.landing.welcome}</h1>
      <p>{dictionary.landing.description}</p>
    </main>
  )
}

export default Page
