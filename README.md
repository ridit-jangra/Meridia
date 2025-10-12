# Meridia

![Meridia Screenshot](./resources/whole.png)

Meridia is a modern IDE designed for developers. While its core focus is Python, it now **supports multiple programming languages** including JavaScript, TypeScript, Rust, Bash, Java, C, C++, Lua, Swift, SQL, and more. This means you can **write, run, and manage projects in different languages without leaving the IDE**.

It combines a clean, minimal design with powerful tools for coding, data workflows, and visualization—all in one place.

## Getting Started

Clone and start the project locally:

```bash
git clone https://github.com/MeridiaByMNovus/Meridia.git
```

```bash
npm install
```

```bash
npm run dev
```

## Environment Variables

Create a `.env` file in the root directory and add:

```bash
NODE_ENV=development
```

## Features

### Intelligent Editor Core

At the heart of Meridia lies the Monaco Editor. Each file you open is managed as a model, representing its text, language, and edit history. Meridia extends Monaco’s capabilities to handle multiple languages, syntax-aware tooling, and live code analysis—all through a unified editor interface.

### File Models

Meridia uses Monaco’s URI-based model system to simulate a virtual file system. Every open file, whether it exists locally or in memory, has its own unique URI (`file:///`), ensuring accurate language features and file tracking across tabs and sessions.

### Editors & Views

Each editor window is a visual view of a model, synchronized with your workspace state. You can open multiple views of the same file, manage them in tabs, or split the layout to view different parts of your project simultaneously—all with persistent view states.

### Smart Providers

Meridia integrates language providers for completion, hover information, and diagnostics. It supports multiple languages through both built-in and external Language Server Protocol (LSP) bridges, enabling accurate IntelliSense, go-to-definition, and error checking for each file type.

### Advanced Coding Tools

- Autocomplete and Inline Documentation — Smart suggestions powered by AI and LSP servers
- Inline Results — View variable outputs and data previews right next to your code
- Quick Fixes and Refactors — Contextual fixes for syntax and logic issues

### Mira, the Voice Assistant

Perform actions hands-free: open files, describe code, insert snippets, or run commands—all through voice control powered by Mira.

### Integrated Environment

- Built-in Terminal — Run commands without leaving the IDE
- Project Runner — Execute scripts and visualize output directly
- Problems — Visualize errors in files
- Data Studio — Import, clean, and visualize datasets interactively

### Customizable Experience

- Dynamic Themes — Full color customization with syntax highlighting control
- Flexible Layouts — Resize, drag, or detach panels
- Persistent State — Meridia remembers your open files, positions, and layout preferences

### Plugin System

Meridia include a plugin architecture allowing developers to add:

- Command palette actions
- Third-party integrations and tools

### Cross-Platform Support

Meridia runs seamlessly on Windows and Linux, offering consistent performance and design across devices.

# Installation

For now you can use the local guide to use Meridia.
