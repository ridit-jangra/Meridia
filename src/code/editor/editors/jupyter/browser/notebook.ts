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
      console.error("Editor area not found!");
      return;
    }

    this._notebook = document.createElement("div");
    this._notebook.className = "jupyter-notebook";
    this._notebook.style.display = "none"; // ✅ Start hidden

    _layout.appendChild(this._notebook);

    // ✅ Register AFTER creating the element
    addStandaloneForExtension(this._extensions, this);

    this._isMounted = true;

    console.log("✅ Notebook mounted and hidden");
  }

  async _open(filePath: string) {
    // ✅ Ensure mounted before opening
    if (!this._isMounted) {
      console.warn("Notebook not mounted, mounting now...");
      await this._mount();
    }

    console.log("📖 Opening notebook:", filePath);

    this._notebook.innerHTML = "";

    const existingBook = this.books.get(filePath);

    let book: Book;

    if (existingBook) {
      book = existingBook;
      console.log("Using existing book");
    } else {
      book = new Book(filePath);
      await book.mount();
      this.books.set(filePath, book);
      console.log("Created new book");
    }

    this._notebook.appendChild(book.getElement());
  }

  _close() {
    console.log("❌ Closing notebook");
    this._notebook.innerHTML = "";
  }

  _setVisiblity(visible: boolean) {
    if (!this._isMounted || !this._notebook) {
      console.warn(
        "⚠️ Notebook element not initialized, cannot set visibility"
      );
      return;
    }

    console.log(
      `👁️ Setting notebook visibility: ${visible ? "VISIBLE" : "HIDDEN"}`
    );

    this._notebook.style.display = visible ? "flex" : "none";
  }

  dispose() {
    console.log("🗑️ Disposing notebook");

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
