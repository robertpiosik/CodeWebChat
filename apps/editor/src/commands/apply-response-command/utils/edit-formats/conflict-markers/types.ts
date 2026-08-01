export type Segment =
  | { type: 'common'; lines: string[] }
  | { type: 'conflict'; original_lines: string[]; updated_lines: string[] }
