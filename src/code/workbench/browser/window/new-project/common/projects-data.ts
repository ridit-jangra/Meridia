import { getFileIcon } from "../../../../common/utils.js";
import { IProjectTree } from "../../../../workbench.types.js";
import { getThemeIcon } from "../../../media/icons.js";

export const projectTree: IProjectTree[] = [
  {
    name: "Python",
    icon: getFileIcon("file.py"),
    key: "python",
    children: [
      {
        name: "Empty",
        content: "",
        key: "python-empty",
        icon: getThemeIcon("default"),
      },
      {
        name: "Django",
        content: "",
        key: "python-django",
        icon: getThemeIcon("django"),
      },
      {
        name: "Flask",
        content: "",
        key: "python-flask",
        icon: getThemeIcon("flask"),
      },
      {
        name: "FastAPI",
        content: "",
        key: "python-fastapi",
        icon: getThemeIcon("fastAPI"),
      },
    ],
  },
  {
    name: "Typescript",
    icon: getFileIcon("file.ts"),
    key: "typescript",
    children: [
      {
        name: "Empty",
        content: "",
        key: "ts-empty",
        icon: getThemeIcon("default"),
      },
      {
        name: "React",
        content: "",
        key: "ts-react",
        icon: getThemeIcon("react"),
      },
      {
        name: "Next.js",
        content: "",
        key: "ts-next",
        icon: getThemeIcon("nextjs"),
      },
    ],
  },
  {
    name: "Javascript",
    icon: getFileIcon("file.js"),
    key: "javascript",
    children: [
      {
        name: "Empty",
        content: "",
        key: "js-empty",
        icon: getThemeIcon("default"),
      },
      {
        name: "React",
        content: "",
        key: "js-react",
        icon: getThemeIcon("react"),
      },
      {
        name: "Next.js",
        content: "",
        key: "js-next",
        icon: getThemeIcon("nextjs"),
      },
      { name: "Vue", content: "", key: "js-vue", icon: getThemeIcon("vue") },
      {
        name: "Svelte",
        content: "",
        key: "js-svelte",
        icon: getThemeIcon("svelte"),
      },
    ],
  },
];
