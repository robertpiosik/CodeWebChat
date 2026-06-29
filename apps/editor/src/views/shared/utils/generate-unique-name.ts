export const generate_unique_name = (
  base_name: string | undefined,
  existing_names: (string | undefined)[]
): string => {
  const name_to_check = base_name?.trim()

  if (name_to_check && !existing_names.includes(name_to_check)) {
    return name_to_check
  }

  const match = (name_to_check || '').match(/^(.*?)(?:\s*\((\d+)\))?$/)
  const original_base_name = match?.[1]?.trim()
  const existing_number_str = match?.[2]

  const base_for_duplication =
    existing_number_str !== undefined && original_base_name !== undefined
      ? original_base_name
      : name_to_check || ''

  let copy_number =
    existing_number_str !== undefined
      ? parseInt(existing_number_str, 10) + 1
      : 1

  let new_name = base_for_duplication
    ? `${base_for_duplication} (${copy_number})`
    : `(${copy_number})`

  while (existing_names.includes(new_name)) {
    copy_number++
    new_name = base_for_duplication
      ? `${base_for_duplication} (${copy_number})`
      : `(${copy_number})`
  }

  return new_name
}
