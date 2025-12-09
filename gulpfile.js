const { src, dest, watch, series, parallel } = require("gulp");

const SOURCE_GLOBS = [
  "src/**/*.{html,css,json,svg,png,ico,py,ttf,otf,zip}",
  "!src/**/tsconfig.*",
  "src/code/base/native/cpp/**/*",
  "src/code/base/model/**/*",
];

const EXTENSION_GLOBS = ["extensions/**/*", "!extensions/**/*.{ts}"];

function copyPyright() {
  return src("node_modules/pyright/**/*", {
    base: "node_modules/pyright/",
    allowEmpty: true,
    encoding: false,
  }).pipe(dest("build/extensions/languages/python/server"));
}

function copyFiles() {
  return src(SOURCE_GLOBS, {
    base: "src",
    allowEmpty: true,
    encoding: false,
  }).pipe(dest("build"));
}

function copyExtensions() {
  return src(EXTENSION_GLOBS, {
    base: "extensions",
    allowEmpty: true,
    encoding: false,
  }).pipe(dest("build/extensions"));
}

const build = series(parallel(copyFiles, copyExtensions, copyPyright));

function watchSourceFiles() {
  return watch(SOURCE_GLOBS, { ignoreInitial: false }, copyFiles);
}

function watchExtensionFiles() {
  return watch(EXTENSION_GLOBS, { ignoreInitial: false }, copyExtensions);
}

function watchAll() {
  return parallel(watchSourceFiles, watchExtensionFiles);
}

module.exports = {
  copy: build,
  watch: series(build, watchAll()),
  default: series(build, watchAll()),
};
