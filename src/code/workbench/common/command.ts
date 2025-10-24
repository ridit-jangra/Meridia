export const commands: Map<string, Function> = new Map();

export function addCommand(_name: string, _action: Function) {
  commands.set(_name, _action);
}

export function getCommand(_name: string) {
  return commands.get(_name);
}

export function runCommand(_name: string, args?: any[]) {
  const _command = commands.get(_name);
  if (_command) _command(...args!);
}
