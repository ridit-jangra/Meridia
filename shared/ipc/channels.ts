export const STORAGE_GET = "storage:get";
export const STORAGE_SET = "storage:set";

export const WORKSPACE_GET = "workspace:get";
export const WORKSPACE_STORE = "workspace:store";
export const WORKSPACE_UPDATE = "workspace:update";
export const WORKSPACE_GET_CURRENT_PATH = "workspace:get-current-path";
export const WORKSPACE_SET_CURRENT_PATH = "workspace:set-current-path";
export const WORKSPACE_ASK_UPDATE = "workspace:ask-update";
export const WORKSPACE_CLEAR_CURRENT = "workspace:clear-current";

export const EXPLORER_GET_ROOT_STRUCTURE = "explorer:get-root-structure";
export const EXPLORER_GET_CHILD_STRUCTURE = "explorer:get-child-structure";

export const FS_EXISTS = "fs:exists";
export const FS_SAVE_AS = "fs:save-as";
export const FS_READDIR = "fs:readdir";
export const FS_STAT = "fs:stat";
export const FS_READ_FILE_TEXT = "fs:read-file-text";
export const FS_CREATE_DIR = "fs:create-dir";
export const FS_REMOVE = "fs:remove";
export const FS_WRITE_FILE_TEXT = "fs:write-file-text";
export const FS_RENAME = "fs:rename";
export const FS_READ_BASE_64 = "fs:read_base64";
export const FS_RELATIVE = "fs:relative";
export const FS_OPEN = "fs:open";

export const WATCHER_START = "watcher:start";
export const WATCHER_STOP = "watcher:stop";
export const WATCHER_EVENT = "watcher:event";

export const NODE_PTY_CREATE = "pty:create";
export const NODE_PTY_WRITE = "pty:write";
export const NODE_PTY_RESIZE = "pty:resize";
export const NODE_PTY_KILL = "pty:kill";
export const NODE_PTY_DATA = "pty:data";
export const NODE_PTY_EXIT = "pty:exit";

export const SHELL_OPEN_EXTERNAL = "shell:open-external";

export const GIT_IS_REPO = "git:is-repo";
export const GIT_GET_STATUS = "git:get-status";
export const GIT_STAGE_FILE = "git:stage-file";
export const GIT_STAGE_ALL = "git:stage-all";
export const GIT_UNSTAGE_FILE = "git:unstage-file";
export const GIT_COMMIT = "git:commit";
export const GIT_PUSH = "git:push";
export const GIT_PULL = "git:pull";
export const GIT_GET_LOG = "git:get-log";
export const GIT_DISCARD = "git:discard";

export const CHAT_PUSH = "chat:push";

export const SHORTCUT_EXECUTE = "shortcut:execute";

export const EDITOR_OPEN_FILE = "editor:openFile";
export const EDITOR_ACTIVE_FILE = "editor:activeFile";
export const EDITOR_SELECTION = "editor:selection";
export const EDITOR_SCROLL_TO_LINE = "editor:scrollToLine";

export const TERMINAL_RUN_FILE = "terminal:runFile";
export const TERMINAL_RUN_COMMAND = "terminal:runCommand";
export const TERMINAL_GET_OUTPUT = "terminal:getOutput";
export const TERMINAL_OUTPUT_RESPONSE = "terminal:outputResponse";

export const UI_SHOW_NOTIFICATION = "ui:showNotification";
export const UI_SET_STATUS_BAR = "ui:setStatusBar";
