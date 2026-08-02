export type Segment =
  | { type: 'common'; lines: string[] }
  | {
      type: 'search_replace'
      original_lines: string[]
      updated_lines: string[]
    }
