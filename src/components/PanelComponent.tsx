export function PanelComponent({ id }: { id: string }) {
  return (
    <div className="h-full w-full bg-neutral-900 text-white p-3">{id}</div>
  );
}
