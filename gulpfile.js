const { src, dest, watch, series, parallel } = require("gulp");

const SOURCE_GLOBS = [
  "src/**/*.{html,css,json,svg,png,ico,py,ttf,otf,zip}",
  "!src/**/tsconfig.*",
  "src/code/base/native/cpp/**/*",
  "src/code/base/model/**/*",
];

const EXTENSION_GLOBS = ["extensions/**/*", "!extensions/**/*.{ts,js}"];

function copyFiles() {
  return src(SOURCE_GLOBS, {
    base: "src",
    allowEmpty: true,
    encoding: false,
  }).pipe(dest("build"));
}

function copyPyright() {
  return src("node_modules/pyright/**/*", {
    base: "node_modules/pyright/",
    allowEmpty: true,
    encoding: false,
  }).pipe(dest("build/language/python"));
}

function copyTypescript() {
  return src("node_modules/typescript-language-server/**/*", {
    base: "node_modules/typescript-language-server/",
    allowEmpty: true,
    encoding: false,
  }).pipe(dest("build/language/typescript"));
}

function copyBash() {
  return src("node_modules/bash-language-server/**/*", {
    base: "node_modules/bash-language-server/",
    allowEmpty: true,
    encoding: false,
  }).pipe(dest("build/language/bash"));
}

function copyExtensions() {
  return src(EXTENSION_GLOBS, {
    base: "extensions",
    allowEmpty: true,
    encoding: false,
  }).pipe(dest("build/extensions"));
}

function copyPrettier() {
  return src("node_modules/prettier/**/*", {
    base: "node_modules/prettier/",
    allowEmpty: true,
    encoding: false,
  }).pipe(dest("build/formatter/prettier"));
}

function copyPrettierRust() {
  return src("node_modules/prettier-plugin-rust/**/*", {
    base: "node_modules/prettier-plugin-rust/",
    allowEmpty: true,
    encoding: false,
  }).pipe(dest("build/formatter/prettier-rust"));
}

function copyPrettierPython() {
  return src("node_modules/@prettier/plugin-python/**/*", {
    base: "node_modules/@prettier/plugin-python/",
    allowEmpty: true,
    encoding: false,
  }).pipe(dest("build/formatter/prettier-python"));
}

const build = series(
  parallel(
    copyFiles,
    copyTypescript,
    copyPyright,
    copyBash,
    copyPrettier,
    copyPrettierRust,
    copyPrettierPython,
    copyExtensions
  )
);

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
