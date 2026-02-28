export type Insight = {
  id: string;
  message: string;
  actions: {
    label: string;
    run: () => void;
  }[];
  meta?: Record<string, unknown>;
};
