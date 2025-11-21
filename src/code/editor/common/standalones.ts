export const standalones = new Map<string, any>();

export function addStandaloneForExtension(
  extensions: string[],
  standalone: any
) {
  extensions.forEach((ext) => {
    standalones.set(ext, standalone);
  });
}

export function getStandaloneForExtension(extension: string) {
  return standalones.get(extension);
}
