export const check_matches_condition = (params: {
  text: string
  positive_regexes: RegExp[]
  negative_regexes: RegExp[]
  match_mode?: 'all' | 'some'
}) => {
  if (params.negative_regexes.some((r) => r.test(params.text))) {
    return false
  }
  if (params.positive_regexes.length == 0) {
    return true
  }
  if (params.match_mode == 'some') {
    return params.positive_regexes.some((r) => r.test(params.text))
  }
  return params.positive_regexes.every((r) => r.test(params.text))
}
