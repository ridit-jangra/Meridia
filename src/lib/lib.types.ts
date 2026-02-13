export interface ITitlebarMenuItem {
  id: string;
  name: string;
  command?: string;
  submenu?: ITitlebarMenuItem[];
}
