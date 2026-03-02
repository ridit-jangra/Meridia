import { shortcut_ctx } from "../../../../types/shortcut.types";

const tok = (s: string) =>
  s.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);

export const eval_when = (expr: string | undefined, ctx: shortcut_ctx) => {
  if (!expr || !expr.trim()) return true;

  const tokens = tok(
    expr
      .replace(/\&\&/g, " && ")
      .replace(/\|\|/g, " || ")
      .replace(/\!/g, " ! "),
  );

  let i = 0;

  const read_term: any = () => {
    if (tokens[i] === "!") {
      i++;
      return !read_term();
    }
    const t = tokens[i++] ?? "";
    return !!ctx[t];
  };

  let acc = read_term();

  while (i < tokens.length) {
    const op = tokens[i++];
    if (op === "&&") acc = acc && read_term();
    else if (op === "||") acc = acc || read_term();
    else acc = acc && !!ctx[op];
  }

  return acc;
};
