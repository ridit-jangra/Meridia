import path from "path";
import { PythonShell } from "python-shell";

const _extractVoicePath = path.join(
  __dirname,
  "code",
  "base",
  "scripts",
  "extract_text.py"
);

const _downloadPath = path.join(
  __dirname,
  "code",
  "base",
  "scripts",
  "download.py"
);

const _voiceArgs = {
  ...PythonShell.defaultOptions,
  args: ["--preload", "preload.wav"],
};

const _downloadArgs = {
  ...PythonShell.defaultOptions,
};

const _voiceShell = new PythonShell(_extractVoicePath, _voiceArgs);
const _downloadShell = new PythonShell(_downloadPath, _downloadArgs);
