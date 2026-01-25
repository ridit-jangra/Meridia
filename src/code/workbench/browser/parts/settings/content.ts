import { settingsContent } from "../../../common/settings/settings-data";
import { CoreEl } from "../core";

export class Content extends CoreEl {
  constructor() {
    super();
    this._createEl();
  }

  public changeContent(key: string) {
    if (!this._el) return;

    const content = this.getContent(key);
    if (!content) return;

    this._el.innerHTML = "";

    content.map((v) => {
      const settingEl = document.createElement("div");
      settingEl.className = "setting";

      const label = document.createElement("p");
      label.className = "label";
      label.textContent = v.label;

      if (v.type === "select") {
        const select = document.createElement("select");

        const description = document.createElement("p");
        description.className = "description";
        description.textContent = v.description;

        v.options.map((f) => {
          const optionEl = document.createElement("option");
          optionEl.textContent = f;

          select.appendChild(optionEl);
        });

        settingEl.appendChild(label);
        settingEl.appendChild(description);
        settingEl.appendChild(select);

        this._el!.appendChild(settingEl);
      }

      if (v.type === "input") {
        const inputEl = document.createElement("div");
        inputEl.className = "input";

        const description = document.createElement("p");
        description.className = "description";
        description.textContent = v.description;

        const input = document.createElement("input");
        input.placeholder = v.placeholder!;
        input.value = v.default;

        inputEl.appendChild(input);

        settingEl.appendChild(label);
        settingEl.appendChild(description);
        settingEl.appendChild(inputEl);

        this._el!.appendChild(settingEl);
      }

      if (v.type === "number") {
        const inputEl = document.createElement("div");
        inputEl.className = "input";

        const description = document.createElement("p");
        description.className = "description";
        description.textContent = v.description;

        const input = document.createElement("input");
        input.type = "number";
        input.min = v.min!.toString();
        input.max = v.max!.toString();
        input.value = v.default!.toString();

        inputEl.appendChild(input);

        settingEl.appendChild(label);
        settingEl.appendChild(description);
        settingEl.appendChild(inputEl);

        this._el!.appendChild(settingEl);
      }

      if (v.type === "checkbox") {
        const checkboxEl = document.createElement("div");
        checkboxEl.className = "checkbox";
        checkboxEl.style.display = "flex";
        checkboxEl.style.gap = "4px";
        checkboxEl.style.alignItems = "center";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.defaultChecked = v.default;

        const description = document.createElement("p");
        description.className = "description";
        description.textContent = v.description;

        checkboxEl.appendChild(checkbox);
        checkboxEl.appendChild(description);

        settingEl.appendChild(label);
        settingEl.appendChild(checkboxEl);

        this._el!.appendChild(settingEl);
      }

      if (v.type === "radio") {
        const description = document.createElement("p");
        description.className = "description";
        description.textContent = v.description;

        const optionsEl = document.createElement("div");

        v.options.map((v) => {
          const optionEl = document.createElement("div");
          optionEl.style.display = "flex";
          optionEl.style.gap = "4px";
          optionEl.style.alignItems = "center";

          const radio = document.createElement("input");
          radio.type = "radio";

          const label = document.createElement("p");
          label.textContent = v;

          optionEl.appendChild(radio);
          optionEl.appendChild(label);

          optionsEl.appendChild(optionEl);
        });

        settingEl.appendChild(label);
        settingEl.appendChild(description);
        settingEl.appendChild(optionsEl);

        this._el!.appendChild(settingEl);
      }

      if (v.type === "range") {
        const description = document.createElement("p");
        description.className = "description";
        description.textContent = v.description;

        const input = document.createElement("input");
        input.type = "range";
        input.value = v.default.toString();
        input.step = v.step.toString();
        input.min = v.min.toString();
        input.max = v.max.toString();

        settingEl.appendChild(label);
        settingEl.appendChild(description);
        settingEl.appendChild(input);

        this._el!.appendChild(settingEl);
      }
    });
  }

  private getContent(key: string) {
    const content = settingsContent.settings.find((v) => v.key === key);
    return content?.content;
  }

  private _createEl() {
    this._el = document.createElement("div");
    this._el.className = "content";

    this.changeContent("editorText");
  }
}
