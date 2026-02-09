import { getThemeIcon } from "../../workbench/browser/media/icons.js";

const _function = getThemeIcon("function").getHTML();
const _functionSvg = `data:image/svg+xml;base64,${btoa(_function)}`;

const _variable = getThemeIcon("variable").getHTML();
const _variableSvg = `data:image/svg+xml;base64,${btoa(_variable)}`;

const _class = getThemeIcon("class").getHTML();
const _classSvg = `data:image/svg+xml;base64,${btoa(_class)}`;

const _property = getThemeIcon("property").getHTML();
const _propertySvg = `data:image/svg+xml;base64,${btoa(_property)}`;

const _module = getThemeIcon("module").getHTML();
const _moduleSvg = `data:image/svg+xml;base64,${btoa(_module)}`;

const _constant = getThemeIcon("constant").getHTML();
const _constantSvg = `data:image/svg+xml;base64,${btoa(_constant)}`;

const css = `
  .codicon-symbol-function::before {
    content: ''; 
    background-image: url('${_functionSvg}') !important;
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
    width: 16px;
    height: 16px;
    display: inline-block;
    color: transparent;
  }
  .codicon-symbol-variable::before {
    content: ''; 
    background-image: url('${_variableSvg}') !important;
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
    width: 16px;
    height: 16px;
    display: inline-block;
    color: transparent;}
 .codicon-symbol-class::before {
    content: ''; 
    background-image: url('${_classSvg}') !important;
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
    width: 16px;
    height: 16px;
    display: inline-block;
    color: transparent;}
  .codicon-symbol-keyword::before {
      content: ''; 
    background-image: url('') !important;
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
    width: 16px;
    height: 16px;
    display: inline-block;
    color: transparent;
    }
.codicon-symbol-property::before {
  content: ''; 
  background-image: url('${_propertySvg}') !important;
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
  width: 16px;
  height: 16px;
  display: inline-block;
  color: transparent;
}
    .codicon-symbol-module::before {
      content: ''; 
    background-image: url('${_moduleSvg}') !important;
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
    width: 16px;
    height: 16px;
    display: inline-block;
    color: transparent;}
    .codicon-symbol-constant::before {
      content: ''; 
    background-image: url('${_constantSvg}') !important;
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
    width: 16px;
    height: 16px;
    display: inline-block;
    color: transparent;}
`;

const style = document.createElement("style");
style.appendChild(document.createTextNode(css));
document.head.appendChild(style);
