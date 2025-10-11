export const languages = new Map<string, number>();

export function registerLanguageServer(_extension: string, _port: number) {
  console.log(languages);
  languages.set(_extension, _port);
}

export function getLanguageServer(_extension: string) {
  return languages.get(_extension);
}
