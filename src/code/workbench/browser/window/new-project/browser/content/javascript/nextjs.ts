import { getFileIcon } from "../../../../../../common/utils.js";
import { getThemeIcon } from "../../../../../media/icons.js";
import { CoreEl } from "../../../../../parts/core.js";
import { _newProject } from "../../new-project.js";

export class NextJS extends CoreEl {
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
    icon1.innerHTML = getFileIcon("file.js");

    crumb1.appendChild(icon1);

    const seperator = document.createElement("span");
    seperator.className = "seperator";
    seperator.textContent = "/";

    const crumb2 = document.createElement("div");
    crumb2.className = "crumb";

    const icon2 = document.createElement("span");
    icon2.appendChild(getThemeIcon("nextjs"));

    const title = document.createElement("span");
    title.textContent = "Next.js";

    crumb2.appendChild(icon2);
    crumb2.appendChild(title);

    titleBreadCrumb.appendChild(crumb1);
    titleBreadCrumb.appendChild(seperator);
    titleBreadCrumb.appendChild(crumb2);

    const description = document.createElement("span");
    description.className = "description";
    description.textContent =
      "Full-featured Next.js 15+ project with all modern options.";

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

    const checkboxWrapperTurbopack = document.createElement("div");
    checkboxWrapperTurbopack.className = "checkbox-wrapper";
    const checkboxTitleTurbopack = document.createElement("span");
    checkboxTitleTurbopack.textContent = "Turbopack (beta)";
    const checkboxTurbopack = document.createElement("input");
    checkboxTurbopack.type = "checkbox";
    checkboxTurbopack.checked = true;
    checkboxWrapperTurbopack.appendChild(checkboxTitleTurbopack);
    checkboxWrapperTurbopack.appendChild(checkboxTurbopack);

    const checkboxWrapperAppRouter = document.createElement("div");
    checkboxWrapperAppRouter.className = "checkbox-wrapper";
    const checkboxTitleAppRouter = document.createElement("span");
    checkboxTitleAppRouter.textContent = "App Router (app/)";
    const checkboxAppRouter = document.createElement("input");
    checkboxAppRouter.type = "checkbox";
    checkboxAppRouter.checked = true;
    checkboxWrapperAppRouter.appendChild(checkboxTitleAppRouter);
    checkboxWrapperAppRouter.appendChild(checkboxAppRouter);

    const checkboxWrapperTailwind = document.createElement("div");
    checkboxWrapperTailwind.className = "checkbox-wrapper";
    const checkboxTitleTailwind = document.createElement("span");
    checkboxTitleTailwind.textContent = "Tailwind CSS";
    const checkboxTailwind = document.createElement("input");
    checkboxTailwind.type = "checkbox";
    checkboxTailwind.checked = true;
    checkboxWrapperTailwind.appendChild(checkboxTitleTailwind);
    checkboxWrapperTailwind.appendChild(checkboxTailwind);

    const checkboxWrapperEslint = document.createElement("div");
    checkboxWrapperEslint.className = "checkbox-wrapper";
    const checkboxTitleEslint = document.createElement("span");
    checkboxTitleEslint.textContent = "ESLint";
    const checkboxEslint = document.createElement("input");
    checkboxEslint.type = "checkbox";
    checkboxEslint.checked = true;
    checkboxWrapperEslint.appendChild(checkboxTitleEslint);
    checkboxWrapperEslint.appendChild(checkboxEslint);

    const checkboxWrapperReactIcons = document.createElement("div");
    checkboxWrapperReactIcons.className = "checkbox-wrapper";
    const checkboxTitleReactIcons = document.createElement("span");
    checkboxTitleReactIcons.textContent = "React Icons";
    const checkboxReactIcons = document.createElement("input");
    checkboxReactIcons.type = "checkbox";
    checkboxReactIcons.checked = true;
    checkboxWrapperReactIcons.appendChild(checkboxTitleReactIcons);
    checkboxWrapperReactIcons.appendChild(checkboxReactIcons);

    const checkboxWrapperSrcDir = document.createElement("div");
    checkboxWrapperSrcDir.className = "checkbox-wrapper";
    const checkboxTitleSrcDir = document.createElement("span");
    checkboxTitleSrcDir.textContent = "src/ directory";
    const checkboxSrcDir = document.createElement("input");
    checkboxSrcDir.type = "checkbox";
    checkboxSrcDir.checked = true;
    checkboxWrapperSrcDir.appendChild(checkboxTitleSrcDir);
    checkboxWrapperSrcDir.appendChild(checkboxSrcDir);

    const checkboxWrapperAlias = document.createElement("div");
    checkboxWrapperAlias.className = "checkbox-wrapper";
    const checkboxTitleAlias = document.createElement("span");
    checkboxTitleAlias.textContent = "@/* → src/";
    const checkboxAlias = document.createElement("input");
    checkboxAlias.type = "checkbox";
    checkboxAlias.checked = true;
    checkboxWrapperAlias.appendChild(checkboxTitleAlias);
    checkboxWrapperAlias.appendChild(checkboxAlias);

    const checkboxWrapperSwcMinify = document.createElement("div");
    checkboxWrapperSwcMinify.className = "checkbox-wrapper";
    const checkboxTitleSwcMinify = document.createElement("span");
    checkboxTitleSwcMinify.textContent = "SWC Minify";
    const checkboxSwcMinify = document.createElement("input");
    checkboxSwcMinify.type = "checkbox";
    checkboxSwcMinify.checked = true;
    checkboxWrapperSwcMinify.appendChild(checkboxTitleSwcMinify);
    checkboxWrapperSwcMinify.appendChild(checkboxSwcMinify);

    optionsForm.appendChild(checkboxWrapperTurbopack);
    optionsForm.appendChild(checkboxWrapperAppRouter);
    optionsForm.appendChild(checkboxWrapperTailwind);
    optionsForm.appendChild(checkboxWrapperEslint);
    optionsForm.appendChild(checkboxWrapperReactIcons);
    optionsForm.appendChild(checkboxWrapperSrcDir);
    optionsForm.appendChild(checkboxWrapperAlias);
    optionsForm.appendChild(checkboxWrapperSwcMinify);

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
      const turbopack = !!checkboxTurbopack.checked;
      const appRouter = !!checkboxAppRouter.checked;
      const tailwind = !!checkboxTailwind.checked;
      const eslint = !!checkboxEslint.checked;
      const reactIcons = !!checkboxReactIcons.checked;
      const srcDir = !!checkboxSrcDir.checked;
      const alias = !!checkboxAlias.checked;
      const swcMinify = !!checkboxSwcMinify.checked;

      if (!name) {
        inputName.focus();
        return;
      }
      if (!path) {
        inputPath.focus();
        return;
      }

      this._create(
        name,
        path,
        turbopack,
        appRouter,
        tailwind,
        eslint,
        reactIcons,
        srcDir,
        alias,
        swcMinify,
      );
    });

    this._el.appendChild(titlebar);
    this._el.appendChild(content);
    this._el.appendChild(create);
  }

  private _create(
    name: string,
    path: string,
    turbopack: boolean,
    appRouter: boolean,
    tailwind: boolean,
    eslint: boolean,
    reactIcons: boolean,
    srcDir: boolean,
    alias: boolean,
    swcMinify: boolean,
  ) {
    window.ipc.invoke(
      "workbench.workspace.project.create.javascript.nextjs",
      name,
      path,
      turbopack,
      appRouter,
      tailwind,
      eslint,
      reactIcons,
      srcDir,
      alias,
      swcMinify,
    );

    window.ipc.once(
      "workbench.workspace.project.javascript.nextjs.complete",
      (_: any, projectPath: string) => {
        _newProject._hide();
        if (window.files?.changeFolder) {
          window.files.changeFolder(projectPath);
        }
      },
    );
  }
}

export const _javascriptNextJS = new NextJS();
