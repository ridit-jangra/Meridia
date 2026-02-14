export function cn(...v: Array<string | null | undefined | false>) {
  return v.filter(Boolean).join(" ");
}
