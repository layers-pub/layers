const { readFile } = require("node:fs/promises");

const { imageSize } = require("./index.cjs");

async function imageSizeFromFile(path) {
  return imageSize(await readFile(path));
}

module.exports = { imageSizeFromFile };
