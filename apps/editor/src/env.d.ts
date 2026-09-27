declare module '@joplin/turndown'
declare module '@joplin/turndown-plugin-gfm'

declare function acquireVsCodeApi(): {
  postMessage(message: any): void
  setState(state: any): void
  getState(): any
}
