import { shortcuts } from "../../../services/shortcut/shortcut.service";
import { CommandGroup } from "../command";

const to_id = (s: string) => s.toLowerCase().replace(/\s+/g, "-");

export function build_command_groups(): CommandGroup[] {
  const categories = shortcuts.list_categories({
    include_uncategorized: true,
  });

  return categories.map((cat) => {
    const items = shortcuts.get_shortcuts_by_category(cat);

    return {
      id: to_id(cat),
      name: cat,
      prefix: `${cat.toLowerCase()}:`,
      items,
    };
  });
}
