declare module '*.scss'
declare module '*.css'
declare module 'simplebar-react'

declare module '*.module.scss' {
  const classes: { [key: string]: string }
  export default classes
}
