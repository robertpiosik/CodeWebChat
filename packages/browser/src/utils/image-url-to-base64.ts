export const image_url_to_base64 = async (
  url: string
): Promise<string | null> => {
  try {
    const response = await fetch(url)
    const blob = await response.blob()

    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () =>
        reject(new Error('Failed to convert image to base64'))
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('Error fetching image as base64:', error)
    return null
  }
}
