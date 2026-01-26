import { settingsContent } from "../../../common/settings/settings-data";
import { CoreEl } from "../core";
import { settingsManager } from "../../../common/settings/settings-manager";
import { ISetting } from "../../../workbench.types";

export class Content extends CoreEl {
  private disposables: (() => void)[] = [];

  constructor() {
    super();
    this._createEl();
  }

  public changeContent(key: string) {
    if (!this._el) return;

    // Clean up previous listeners
    this.disposables.forEach((dispose) => dispose());
    this.disposables = [];

    const content = this.getContent(key);
    if (!content) return;

    this._el.innerHTML = "";

    content.forEach((setting) => {
      const settingEl = this.createSettingElement(setting);
      this._el!.appendChild(settingEl);
    });
  }

  private createSettingElement(setting: ISetting): HTMLDivElement {
    const settingEl = document.createElement("div");
    settingEl.className = "setting";

    const label = document.createElement("p");
    label.className = "label";
    label.textContent = setting.label;

    const description = document.createElement("p");
    description.className = "description";
    description.textContent = setting.description;

    settingEl.appendChild(label);
    settingEl.appendChild(description);

    switch (setting.type) {
      case "select":
        this.createSelectInput(settingEl, setting);
        break;
      case "input":
        this.createTextInput(settingEl, setting);
        break;
      case "number":
        this.createNumberInput(settingEl, setting);
        break;
      case "checkbox":
        this.createCheckboxInput(settingEl, setting);
        break;
      case "radio":
        this.createRadioInput(settingEl, setting);
        break;
      case "range":
        this.createRangeInput(settingEl, setting);
        break;
    }

    return settingEl;
  }

  private createSelectInput(container: HTMLDivElement, setting: any) {
    const select = document.createElement("select");

    setting.options.forEach((option: string) => {
      const optionEl = document.createElement("option");
      optionEl.value = option;
      optionEl.textContent = option;
      select.appendChild(optionEl);
    });

    // Set initial value
    select.value = settingsManager.get(setting.key as any);

    // Listen for changes
    select.addEventListener("change", () => {
      settingsManager.set(setting.key as any, select.value);
    });

    // Watch for external changes
    const unwatch = settingsManager.watch(setting.key as any, (value) => {
      select.value = value;
    });
    this.disposables.push(unwatch);

    container.appendChild(select);
  }

  private createTextInput(container: HTMLDivElement, setting: any) {
    const inputEl = document.createElement("div");
    inputEl.className = "input";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = setting.placeholder || "";
    input.value = settingsManager.get(setting.key as any);

    // Debounce input changes
    let timeout: NodeJS.Timeout;
    input.addEventListener("input", () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        settingsManager.set(setting.key as any, input.value);
      }, 300);
    });

    const unwatch = settingsManager.watch(setting.key as any, (value) => {
      if (input.value !== value) {
        input.value = value;
      }
    });
    this.disposables.push(unwatch);

    inputEl.appendChild(input);
    container.appendChild(inputEl);
  }

  private createNumberInput(container: HTMLDivElement, setting: any) {
    const inputEl = document.createElement("div");
    inputEl.className = "input";

    const input = document.createElement("input");
    input.type = "number";
    if (setting.min !== undefined) input.min = setting.min.toString();
    if (setting.max !== undefined) input.max = setting.max.toString();
    if (setting.step !== undefined) input.step = setting.step.toString();
    input.value = settingsManager.get(setting.key as any).toString();

    input.addEventListener("input", () => {
      const numValue = parseFloat(input.value);
      if (!isNaN(numValue)) {
        settingsManager.set(setting.key as any, numValue);
      }
    });

    const unwatch = settingsManager.watch(setting.key as any, (value) => {
      if (parseFloat(input.value) !== value) {
        input.value = value.toString();
      }
    });
    this.disposables.push(unwatch);

    inputEl.appendChild(input);
    container.appendChild(inputEl);
  }

  private createCheckboxInput(container: HTMLDivElement, setting: any) {
    const checkboxEl = document.createElement("div");
    checkboxEl.className = "checkbox";
    checkboxEl.style.display = "flex";
    checkboxEl.style.gap = "4px";
    checkboxEl.style.alignItems = "center";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = settingsManager.get(setting.key as any);

    checkbox.addEventListener("change", () => {
      settingsManager.set(setting.key as any, checkbox.checked);
    });

    const unwatch = settingsManager.watch(setting.key as any, (value) => {
      checkbox.checked = value;
    });
    this.disposables.push(unwatch);

    const label = document.createElement("label");
    label.textContent = setting.description;

    checkboxEl.appendChild(checkbox);
    checkboxEl.appendChild(label);
    container.appendChild(checkboxEl);
  }

  private createRadioInput(container: HTMLDivElement, setting: any) {
    const optionsEl = document.createElement("div");
    const groupName = `radio-${setting.key}`;

    setting.options.forEach((option: string) => {
      const optionEl = document.createElement("div");
      optionEl.style.display = "flex";
      optionEl.style.gap = "4px";
      optionEl.style.alignItems = "center";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = groupName;
      radio.value = option;
      radio.checked = settingsManager.get(setting.key as any) === option;

      radio.addEventListener("change", () => {
        if (radio.checked) {
          settingsManager.set(setting.key as any, option);
        }
      });

      const label = document.createElement("label");
      label.textContent = option;

      optionEl.appendChild(radio);
      optionEl.appendChild(label);
      optionsEl.appendChild(optionEl);
    });

    const unwatch = settingsManager.watch(setting.key as any, (value) => {
      const radios = optionsEl.querySelectorAll('input[type="radio"]');
      radios.forEach((radio: any) => {
        radio.checked = radio.value === value;
      });
    });
    this.disposables.push(unwatch);

    container.appendChild(optionsEl);
  }

  private createRangeInput(container: HTMLDivElement, setting: any) {
    const rangeContainer = document.createElement("div");
    rangeContainer.style.display = "flex";
    rangeContainer.style.gap = "10px";
    rangeContainer.style.alignItems = "center";

    const input = document.createElement("input");
    input.type = "range";
    input.min = setting.min.toString();
    input.max = setting.max.toString();
    input.step = setting.step.toString();
    input.value = settingsManager.get(setting.key as any).toString();

    const valueDisplay = document.createElement("span");
    valueDisplay.textContent = input.value;
    valueDisplay.style.minWidth = "40px";

    input.addEventListener("input", () => {
      const numValue = parseFloat(input.value);
      valueDisplay.textContent = input.value;
      settingsManager.set(setting.key as any, numValue);
    });

    const unwatch = settingsManager.watch(setting.key as any, (value) => {
      input.value = value.toString();
      valueDisplay.textContent = value.toString();
    });
    this.disposables.push(unwatch);

    rangeContainer.appendChild(input);
    rangeContainer.appendChild(valueDisplay);
    container.appendChild(rangeContainer);
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

  dispose() {
    this.disposables.forEach((dispose) => dispose());
    this.disposables = [];
  }
}
