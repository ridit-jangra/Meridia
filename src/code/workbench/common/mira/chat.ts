import { GoogleGenAI, Type } from "@google/genai";
import { Model } from "./model.js";
import { IChatMessage, IEditorTab } from "../../types.js";
import { _fileTools, FileOperations } from "./fileOperations.js";
import { dispatch } from "../store/store.js";
import { update_editor_tabs } from "../store/slice.js";
import { select } from "../store/selector.js";

const path = window.path;

export class Chat {
  private _model: GoogleGenAI;
  private _fileOps: FileOperations;

  constructor() {
    this._model = new Model().getModel();
    this._fileOps = new FileOperations();
  }

  public async chat(_message: string, _history: IChatMessage[] = []) {
    const contents = this._convert(_history, _message);

    let currentContents = contents;
    let maxIterations = 10;
    let iteration = 0;

    while (iteration < maxIterations) {
      const _response = await this._model.models.generateContent({
        model: "gemini-2.0-flash-001",
        contents: currentContents,
        config: {
          // tools: _fileTools,
        },
      });

      if (_response.functionCalls && _response.functionCalls.length > 0) {
        const functionResults = [];

        for (const functionCall of _response.functionCalls) {
          const result = await this._execute(
            functionCall.name!,
            functionCall.args
          );

          functionResults.push({
            name: functionCall.name,
            response: { result },
          });
        }

        currentContents.push({
          role: "model",
          parts: _response.functionCalls.map((fc) => ({
            functionCall: fc,
          })) as any,
        });

        currentContents.push({
          role: "user",
          parts: functionResults.map((fr) => ({
            functionResponse: fr,
          })) as any,
        });

        iteration++;
      } else {
        return _response.text;
      }
    }

    return "Maximum function call iterations reached. Task may be incomplete.";
  }

  private async _execute(functionName: string, args: any): Promise<string> {
    try {
      switch (functionName) {
        case "createFile":
          return this._fileOps.createFile(args.filePath, args.content);

        case "createFolder":
          return this._fileOps.createFolder(args.folderPath);

        case "deleteFile":
          return this._fileOps.deleteFile(args.filePath);

        case "editFile":
          return this._fileOps.editFile(args.filePath, args.content);

        case "renameFile":
          return this._fileOps.renameFile(args.oldPath, args.newPath);

        case "moveFile":
          return this._fileOps.moveFile(args.sourcePath, args.destinationPath);

        case "removeFilesInFolder":
          return this._fileOps.removeFilesInFolder(args.folderPath);

        case "removeFolderRecursive":
          return this._fileOps.removeFolderRecursive(args.folderPath);

        case "openFile":
          return this._open(args.filePath);

        case "listDirectory":
          const files = this._fileOps.listDirectory(args.folderPath);
          return `Directory contents: ${files.join(", ")}`;

        default:
          return `Unknown function: ${functionName}`;
      }
    } catch (error) {
      return `Error executing ${functionName}: ${error}`;
    }
  }

  private _open(_uri: string): string {
    try {
      const result = this._fileOps.openFile(_uri);
      const stateValue = select((s) => s.main.editor_tabs);

      let currentTabs: IEditorTab[] = [];

      if (Array.isArray(stateValue)) {
        currentTabs = stateValue;
      } else if (stateValue && typeof stateValue === "object") {
        currentTabs = Object.values(stateValue);
      }

      const existingTabIndex = currentTabs.findIndex((tab) => tab.uri === _uri);

      if (existingTabIndex !== -1) {
        const updatedTabs = currentTabs.map((tab, index) => ({
          ...tab,
          active: index === existingTabIndex,
        }));

        dispatch(update_editor_tabs(updatedTabs));
      } else {
        const newTab: IEditorTab = {
          name: path.basename(_uri),
          uri: _uri,
          active: true,
          is_touched: false,
        };

        const updatedTabs = [
          ...currentTabs.map((tab) => ({
            ...tab,
            active: false,
          })),
          newTab,
        ];

        dispatch(update_editor_tabs(updatedTabs));
      }

      return result.message;
    } catch (error) {
      throw error;
    }
  }

  private _convert(_history: IChatMessage[], currentMessage: string) {
    const contents = [];

    for (const message of _history) {
      contents.push({
        role: message.isUser ? "user" : "model",
        parts: [
          {
            text: message.content,
          },
        ],
      });
    }

    contents.push({
      role: "user",
      parts: [
        {
          text: currentMessage,
        },
      ],
    });

    return contents;
  }
}
