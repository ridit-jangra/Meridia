const standalones: Map<string, any> = new Map();

export function registerStandalone(name: string, standalone: any): void {
  standalones.set(name, standalone);
}

export function getStandalone(name: string): any | undefined {
  return standalones.get(name);
}
