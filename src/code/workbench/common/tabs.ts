export const _tabsContent = new Map<string, HTMLElement>();

export function _addContent(_uri: string, _content: HTMLElement) {
  _tabsContent.set(_uri, _content);
}

export function _getContent(_uri: string) {
  return _tabsContent.get(_uri);
}
