const { imageMeta } = require("image-meta");

function imageSize(input) {
  const metadata = imageMeta(input);

  if (metadata.width === undefined || metadata.height === undefined) {
    return undefined;
  }

  return metadata;
}

module.exports = { imageSize };
