import { getFileIcon } from "../../../../../../common/utils.js";
import { getThemeIcon } from "../../../../../media/icons.js";
import { CoreEl } from "../../../../../parts/core.js";
import { _newProject } from "../../new-project.js";

export class React extends CoreEl {
  constructor() {
    super();
    this._createEl();
  }

  private _createEl() {
    this._el = document.createElement("div");
    this._el.className = "template-wrapper";

    const titlebar = document.createElement("div");
    titlebar.className = "titlebar";

    const titleBreadCrumb = document.createElement("div");
    titleBreadCrumb.className = "title-bread-crumb";

    const crumb1 = document.createElement("crumb");
    crumb1.className = "crumb";

    const icon1 = document.createElement("span");
    icon1.innerHTML = getFileIcon("file.ts");

    crumb1.appendChild(icon1);

    const seperator = document.createElement("span");
    seperator.className = "seperator";
    seperator.textContent = "/";

    const crumb2 = document.createElement("div");
    crumb2.className = "crumb";

    const icon2 = document.createElement("span");
    icon2.appendChild(getThemeIcon("react"));

    const title = document.createElement("span");
    title.textContent = "React";

    crumb2.appendChild(icon2);
    crumb2.appendChild(title);

    titleBreadCrumb.appendChild(crumb1);
    titleBreadCrumb.appendChild(seperator);
    titleBreadCrumb.appendChild(crumb2);

    const description = document.createElement("span");
    description.className = "description";
    description.textContent = "A full based React project.";

    titlebar.appendChild(titleBreadCrumb);
    titlebar.appendChild(description);

    const content = document.createElement("div");
    content.className = "content";

    const nameForm = document.createElement("div");
    nameForm.className = "form";

    const titleName = document.createElement("span");
    titleName.className = "title";
    titleName.textContent = "Name of the project.";

    const inputWrapperName = document.createElement("div");
    inputWrapperName.className = "input-wrapper";

    const inputName = document.createElement("input");
    inputName.type = "text";
    inputName.placeholder = "Enter the name of the project.";

    inputWrapperName.appendChild(inputName);

    nameForm.appendChild(titleName);
    nameForm.appendChild(inputWrapperName);

    const pathForm = document.createElement("div");
    pathForm.className = "form";

    const titlePath = document.createElement("span");
    titlePath.className = "title";
    titlePath.textContent = "Path of the project.";

    const inputWrapperPath = document.createElement("div");
    inputWrapperPath.className = "input-wrapper";

    const inputPath = document.createElement("input");
    inputPath.type = "text";
    inputPath.placeholder = "Enter the path of the project.";

    const browserPath = document.createElement("span");
    browserPath.className = "option";
    browserPath.appendChild(getThemeIcon("folder"));

    browserPath.onclick = async () => {
      const path = await window.files.getFolderPath();
      if (path) inputPath.value = path;
    };

    inputWrapperPath.appendChild(inputPath);
    inputWrapperPath.appendChild(browserPath);

    const optionsForm = document.createElement("div");
    optionsForm.className = "form checkbox";

    const checkboxWrapperTailwind = document.createElement("div");
    checkboxWrapperTailwind.className = "checkbox-wrapper";

    const checkboxTitleTailwind = document.createElement("span");
    checkboxTitleTailwind.textContent = "Tailwind CSS";

    const checkboxTailwind = document.createElement("input");
    checkboxTailwind.type = "checkbox";
    checkboxTailwind.checked = true;

    checkboxWrapperTailwind.appendChild(checkboxTitleTailwind);
    checkboxWrapperTailwind.appendChild(checkboxTailwind);

    const checkboxWrapperReactIcons = document.createElement("div");
    checkboxWrapperReactIcons.className = "checkbox-wrapper";

    const checkboxTitleReactIcons = document.createElement("span");
    checkboxTitleReactIcons.textContent = "React Icons";

    const checkboxReactIcons = document.createElement("input");
    checkboxReactIcons.type = "checkbox";
    checkboxReactIcons.checked = true;

    checkboxWrapperReactIcons.appendChild(checkboxTitleReactIcons);
    checkboxWrapperReactIcons.appendChild(checkboxReactIcons);

    optionsForm.appendChild(checkboxWrapperTailwind);
    optionsForm.appendChild(checkboxWrapperReactIcons);

    pathForm.appendChild(titlePath);
    pathForm.appendChild(inputWrapperPath);
    pathForm.appendChild(optionsForm);

    content.appendChild(nameForm);
    content.appendChild(pathForm);

    const create = document.createElement("span");
    create.className = "create";
    create.textContent = "Create";

    create.addEventListener("click", () => {
      const name = (inputName.value || "").trim();
      const path = (inputPath.value || "").trim();
      const tailwind = !!checkboxTailwind.checked;
      const reactIcons = !!checkboxReactIcons.checked;
      if (!name) {
        inputName.focus();
        return;
      }
      if (!path) {
        inputName.focus();
        return;
      }
      this._create(name, path, tailwind, reactIcons);
    });

    this._el.appendChild(titlebar);
    this._el.appendChild(content);
    this._el.appendChild(create);
  }

  private _create(
    name: string,
    path: string,
    tailwind: boolean,
    reactIcons: boolean,
  ) {
    window.ipc.invoke(
      "workbench.workspace.project.create.typescript.react",
      name,
      path,
      tailwind,
      reactIcons,
    );

    window.ipc.on(
      "workbench.workspace.project.typescript.react.complete",
      (_: any, path: string) => {
        _newProject._hide();
        window.files.changeFolder(path);
      },
    );
  }
}

export const _typescriptReact = new React();
