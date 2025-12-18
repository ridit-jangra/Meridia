import { registerStandalone } from "../../../../workbench/common/class.js";
import { addStandaloneForExtension } from "../../../common/standalones.js";
import { Standalone } from "../../standalone.js";
import { Book } from "./book.js";

export class Notebook extends Standalone {
  private _notebook!: HTMLDivElement;
  private books = new Map<string, Book>();

  _extensions = [".ipynb"];
  private _isMounted = false;

  async _mount() {
    if (this._isMounted) return;

    this._type = "notebook";

    const _layout = document.querySelector(".editor-area") as HTMLElement;
    if (!_layout) {
      return;
    }

    this._notebook = document.createElement("div");
    this._notebook.className = "jupyter-notebook";
    this._notebook.style.display = "none";

    _layout.appendChild(this._notebook);

    addStandaloneForExtension(this._extensions, this);

    this._isMounted = true;
  }

  async _open(filePath: string) {
    if (!this._isMounted) {
      await this._mount();
    }

    this._notebook.innerHTML = "";

    const existingBook = this.books.get(filePath);

    let book: Book;

    if (existingBook) {
      book = existingBook;
    } else {
      book = new Book(filePath);
      await book.mount();
      this.books.set(filePath, book);
    }

    this._notebook.appendChild(book.getElement());
  }

  _close() {
    this._notebook.innerHTML = "";
  }

  _setVisiblity(visible: boolean) {
    if (!this._isMounted || !this._notebook) {
      return;
    }

    this._notebook.style.display = visible ? "flex" : "none";
  }

  dispose() {
    this.books.forEach((book) => {
      book.dispose();
    });
    this.books.clear();

    if (this._notebook && this._notebook.parentElement) {
      this._notebook.remove();
    }

    this._isMounted = false;
  }
}

export const _notebook = new Notebook();
registerStandalone("jupyter-notebook", _notebook);
