# Docusaurus image-size adapter

Docusaurus 3.10.2 imports `image-size/fromFile`, but its `image-size` 2.0.2 dependency is archived and has unpatched denial-of-service advisories. This local package preserves the imported API while delegating image parsing to the maintained `image-meta` package.

The `2.0.3-layers.0` version identifies this replacement as newer than the vulnerable upstream resolution without claiming an upstream release. Remove the adapter and its override when Docusaurus adopts a maintained parser or `image-size` publishes a patched version.
