import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    'introduction',
    {
      type: 'category',
      label: 'Foundations',
      collapsed: false,
      link: {
        type: 'doc',
        id: 'foundations/index',
      },
      items: [
        'foundations/design-principles',
        'foundations/primitives',
        'foundations/flexible-enums',
        'foundations/lexicon-overview',
      ],
    },
    {
      type: 'category',
      label: 'Lexicon Reference',
      collapsed: false,
      items: [
        'lexicons/defs',
        'lexicons/expression',
        'lexicons/segmentation',
        'lexicons/annotation',
        'lexicons/ontology',
        'lexicons/corpus',
        'lexicons/resource',
        'lexicons/judgment',
        'lexicons/alignment',
        'lexicons/graph',
        'lexicons/persona',
        'lexicons/media',
        'lexicons/eprint',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/index',
        'guides/temporal-representation',
        'guides/spatial-representation',
        'guides/multimodal-annotation',
        'guides/knowledge-grounding',
        'guides/psycholinguistic-data',
        'guides/judgment-data',
      ],
    },
    {
      type: 'category',
      label: 'Integration',
      items: [
        'integration/index',
        {
          type: 'category',
          label: 'Data Models',
          items: [
            'integration/data-models/index',
            'integration/data-models/concrete',
            'integration/data-models/bead',
            'integration/data-models/fovea',
            'integration/data-models/laf-graf',
            'integration/data-models/uima-cas',
            'integration/data-models/conll',
            'integration/data-models/tei',
            'integration/data-models/elan-praat',
            'integration/data-models/folia',
            'integration/data-models/naf',
            'integration/data-models/brat',
            'integration/data-models/amr',
            'integration/data-models/paula-salt',
            'integration/data-models/nif',
            'integration/data-models/w3c-web-annotation',
            'integration/data-models/timeml',
            'integration/data-models/iso-space',
            'integration/data-models/decomp',
          ],
        },
        {
          type: 'category',
          label: 'ATProto Ecosystem',
          items: [
            'integration/atproto/index',
            'integration/atproto/semble',
            'integration/atproto/margin',
            'integration/atproto/chive',
            'integration/atproto/bluesky',
            'integration/atproto/leaflet',
            'integration/atproto/whitewind',
            'integration/atproto/atfile',
            'integration/atproto/labels',
          ],
        },
      ],
    },
  ],
};

export default sidebars;
