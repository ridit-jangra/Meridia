import { ITabsComponentProps } from "./components.types";

export function TabsComponent({ tabs }: ITabsComponentProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 h-12 bg-emerald-400 border-b-red-800 border-b-2 px-2">
        {tabs.map((tab, i) => (
          <div
            key={i}
            className="bg-orange-400 px-3 py-1 rounded-md cursor-pointer"
          >
            {tab.label}
          </div>
        ))}
      </div>
      <div className="bg-amber-400 h-full flex flex-1"></div>
    </div>
  );
}
