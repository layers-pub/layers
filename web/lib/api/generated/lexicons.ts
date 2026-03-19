// @ts-nocheck
/**
 * GENERATED CODE - DO NOT MODIFY
 */
import {
  type LexiconDoc,
  Lexicons,
  ValidationError,
  type ValidationResult,
} from '@atproto/lexicon'
import { type $Typed, is$typed, maybe$typed } from './util'

export const schemaDict = {
  ComAtprotoRepoApplyWrites: {
    lexicon: 1,
    id: 'com.atproto.repo.applyWrites',
    defs: {
      main: {
        type: 'procedure',
        description:
          'Apply a batch transaction of repository creates, updates, and deletes. Requires auth, implemented by PDS.',
        input: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['repo', 'writes'],
            properties: {
              repo: {
                type: 'string',
                format: 'at-identifier',
                description:
                  'The handle or DID of the repo (aka, current account).',
              },
              validate: {
                type: 'boolean',
                description:
                  "Can be set to 'false' to skip Lexicon schema validation of record data across all operations, 'true' to require it, or leave unset to validate only for known Lexicons.",
              },
              writes: {
                type: 'array',
                items: {
                  type: 'union',
                  refs: [
                    'lex:com.atproto.repo.applyWrites#create',
                    'lex:com.atproto.repo.applyWrites#update',
                    'lex:com.atproto.repo.applyWrites#delete',
                  ],
                  closed: true,
                },
              },
              swapCommit: {
                type: 'string',
                description:
                  'If provided, the entire operation will fail if the current repo commit CID does not match this value. Used to prevent conflicting repo mutations.',
                format: 'cid',
              },
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: [],
            properties: {
              commit: {
                type: 'ref',
                ref: 'lex:com.atproto.repo.defs#commitMeta',
              },
              results: {
                type: 'array',
                items: {
                  type: 'union',
                  refs: [
                    'lex:com.atproto.repo.applyWrites#createResult',
                    'lex:com.atproto.repo.applyWrites#updateResult',
                    'lex:com.atproto.repo.applyWrites#deleteResult',
                  ],
                  closed: true,
                },
              },
            },
          },
        },
        errors: [
          {
            name: 'InvalidSwap',
            description:
              "Indicates that the 'swapCommit' parameter did not match current commit.",
          },
        ],
      },
      create: {
        type: 'object',
        description: 'Operation which creates a new record.',
        required: ['collection', 'value'],
        properties: {
          collection: {
            type: 'string',
            format: 'nsid',
          },
          rkey: {
            type: 'string',
            maxLength: 512,
            format: 'record-key',
            description:
              'NOTE: maxLength is redundant with record-key format. Keeping it temporarily to ensure backwards compatibility.',
          },
          value: {
            type: 'unknown',
          },
        },
      },
      update: {
        type: 'object',
        description: 'Operation which updates an existing record.',
        required: ['collection', 'rkey', 'value'],
        properties: {
          collection: {
            type: 'string',
            format: 'nsid',
          },
          rkey: {
            type: 'string',
            format: 'record-key',
          },
          value: {
            type: 'unknown',
          },
        },
      },
      delete: {
        type: 'object',
        description: 'Operation which deletes an existing record.',
        required: ['collection', 'rkey'],
        properties: {
          collection: {
            type: 'string',
            format: 'nsid',
          },
          rkey: {
            type: 'string',
            format: 'record-key',
          },
        },
      },
      createResult: {
        type: 'object',
        required: ['uri', 'cid'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          cid: {
            type: 'string',
            format: 'cid',
          },
          validationStatus: {
            type: 'string',
            knownValues: ['valid', 'unknown'],
          },
        },
      },
      updateResult: {
        type: 'object',
        required: ['uri', 'cid'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          cid: {
            type: 'string',
            format: 'cid',
          },
          validationStatus: {
            type: 'string',
            knownValues: ['valid', 'unknown'],
          },
        },
      },
      deleteResult: {
        type: 'object',
        required: [],
        properties: {},
      },
    },
  },
  ComAtprotoRepoCreateRecord: {
    lexicon: 1,
    id: 'com.atproto.repo.createRecord',
    defs: {
      main: {
        type: 'procedure',
        description:
          'Create a single new repository record. Requires auth, implemented by PDS.',
        input: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['repo', 'collection', 'record'],
            properties: {
              repo: {
                type: 'string',
                format: 'at-identifier',
                description:
                  'The handle or DID of the repo (aka, current account).',
              },
              collection: {
                type: 'string',
                format: 'nsid',
                description: 'The NSID of the record collection.',
              },
              rkey: {
                type: 'string',
                format: 'record-key',
                description: 'The Record Key.',
                maxLength: 512,
              },
              validate: {
                type: 'boolean',
                description:
                  "Can be set to 'false' to skip Lexicon schema validation of record data, 'true' to require it, or leave unset to validate only for known Lexicons.",
              },
              record: {
                type: 'unknown',
                description: 'The record itself. Must contain a $type field.',
              },
              swapCommit: {
                type: 'string',
                format: 'cid',
                description:
                  'Compare and swap with the previous commit by CID.',
              },
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['uri', 'cid'],
            properties: {
              uri: {
                type: 'string',
                format: 'at-uri',
              },
              cid: {
                type: 'string',
                format: 'cid',
              },
              commit: {
                type: 'ref',
                ref: 'lex:com.atproto.repo.defs#commitMeta',
              },
              validationStatus: {
                type: 'string',
                knownValues: ['valid', 'unknown'],
              },
            },
          },
        },
        errors: [
          {
            name: 'InvalidSwap',
            description:
              "Indicates that 'swapCommit' didn't match current repo commit.",
          },
        ],
      },
    },
  },
  ComAtprotoRepoDefs: {
    lexicon: 1,
    id: 'com.atproto.repo.defs',
    defs: {
      commitMeta: {
        type: 'object',
        required: ['cid', 'rev'],
        properties: {
          cid: {
            type: 'string',
            format: 'cid',
          },
          rev: {
            type: 'string',
            format: 'tid',
          },
        },
      },
    },
  },
  ComAtprotoRepoDeleteRecord: {
    lexicon: 1,
    id: 'com.atproto.repo.deleteRecord',
    defs: {
      main: {
        type: 'procedure',
        description:
          "Delete a repository record, or ensure it doesn't exist. Requires auth, implemented by PDS.",
        input: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['repo', 'collection', 'rkey'],
            properties: {
              repo: {
                type: 'string',
                format: 'at-identifier',
                description:
                  'The handle or DID of the repo (aka, current account).',
              },
              collection: {
                type: 'string',
                format: 'nsid',
                description: 'The NSID of the record collection.',
              },
              rkey: {
                type: 'string',
                format: 'record-key',
                description: 'The Record Key.',
              },
              swapRecord: {
                type: 'string',
                format: 'cid',
                description:
                  'Compare and swap with the previous record by CID.',
              },
              swapCommit: {
                type: 'string',
                format: 'cid',
                description:
                  'Compare and swap with the previous commit by CID.',
              },
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            properties: {
              commit: {
                type: 'ref',
                ref: 'lex:com.atproto.repo.defs#commitMeta',
              },
            },
          },
        },
        errors: [
          {
            name: 'InvalidSwap',
          },
        ],
      },
    },
  },
  ComAtprotoRepoDescribeRepo: {
    lexicon: 1,
    id: 'com.atproto.repo.describeRepo',
    defs: {
      main: {
        type: 'query',
        description:
          'Get information about an account and repository, including the list of collections. Does not require auth.',
        parameters: {
          type: 'params',
          required: ['repo'],
          properties: {
            repo: {
              type: 'string',
              format: 'at-identifier',
              description: 'The handle or DID of the repo.',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: [
              'handle',
              'did',
              'didDoc',
              'collections',
              'handleIsCorrect',
            ],
            properties: {
              handle: {
                type: 'string',
                format: 'handle',
              },
              did: {
                type: 'string',
                format: 'did',
              },
              didDoc: {
                type: 'unknown',
                description: 'The complete DID document for this account.',
              },
              collections: {
                type: 'array',
                description:
                  'List of all the collections (NSIDs) for which this repo contains at least one record.',
                items: {
                  type: 'string',
                  format: 'nsid',
                },
              },
              handleIsCorrect: {
                type: 'boolean',
                description:
                  'Indicates if handle is currently valid (resolves bi-directionally)',
              },
            },
          },
        },
      },
    },
  },
  ComAtprotoRepoGetRecord: {
    lexicon: 1,
    id: 'com.atproto.repo.getRecord',
    defs: {
      main: {
        type: 'query',
        description:
          'Get a single record from a repository. Does not require auth.',
        parameters: {
          type: 'params',
          required: ['repo', 'collection', 'rkey'],
          properties: {
            repo: {
              type: 'string',
              format: 'at-identifier',
              description: 'The handle or DID of the repo.',
            },
            collection: {
              type: 'string',
              format: 'nsid',
              description: 'The NSID of the record collection.',
            },
            rkey: {
              type: 'string',
              description: 'The Record Key.',
              format: 'record-key',
            },
            cid: {
              type: 'string',
              format: 'cid',
              description:
                'The CID of the version of the record. If not specified, then return the most recent version.',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['uri', 'value'],
            properties: {
              uri: {
                type: 'string',
                format: 'at-uri',
              },
              cid: {
                type: 'string',
                format: 'cid',
              },
              value: {
                type: 'unknown',
              },
            },
          },
        },
        errors: [
          {
            name: 'RecordNotFound',
          },
        ],
      },
    },
  },
  ComAtprotoRepoImportRepo: {
    lexicon: 1,
    id: 'com.atproto.repo.importRepo',
    defs: {
      main: {
        type: 'procedure',
        description:
          'Import a repo in the form of a CAR file. Requires Content-Length HTTP header to be set.',
        input: {
          encoding: 'application/vnd.ipld.car',
        },
      },
    },
  },
  ComAtprotoRepoListMissingBlobs: {
    lexicon: 1,
    id: 'com.atproto.repo.listMissingBlobs',
    defs: {
      main: {
        type: 'query',
        description:
          'Returns a list of missing blobs for the requesting account. Intended to be used in the account migration flow.',
        parameters: {
          type: 'params',
          properties: {
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 1000,
              default: 500,
            },
            cursor: {
              type: 'string',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['blobs'],
            properties: {
              cursor: {
                type: 'string',
              },
              blobs: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:com.atproto.repo.listMissingBlobs#recordBlob',
                },
              },
            },
          },
        },
      },
      recordBlob: {
        type: 'object',
        required: ['cid', 'recordUri'],
        properties: {
          cid: {
            type: 'string',
            format: 'cid',
          },
          recordUri: {
            type: 'string',
            format: 'at-uri',
          },
        },
      },
    },
  },
  ComAtprotoRepoListRecords: {
    lexicon: 1,
    id: 'com.atproto.repo.listRecords',
    defs: {
      main: {
        type: 'query',
        description:
          'List a range of records in a repository, matching a specific collection. Does not require auth.',
        parameters: {
          type: 'params',
          required: ['repo', 'collection'],
          properties: {
            repo: {
              type: 'string',
              format: 'at-identifier',
              description: 'The handle or DID of the repo.',
            },
            collection: {
              type: 'string',
              format: 'nsid',
              description: 'The NSID of the record type.',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
              description: 'The number of records to return.',
            },
            cursor: {
              type: 'string',
            },
            reverse: {
              type: 'boolean',
              description: 'Flag to reverse the order of the returned records.',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['records'],
            properties: {
              cursor: {
                type: 'string',
              },
              records: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:com.atproto.repo.listRecords#record',
                },
              },
            },
          },
        },
      },
      record: {
        type: 'object',
        required: ['uri', 'cid', 'value'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          cid: {
            type: 'string',
            format: 'cid',
          },
          value: {
            type: 'unknown',
          },
        },
      },
    },
  },
  ComAtprotoRepoPutRecord: {
    lexicon: 1,
    id: 'com.atproto.repo.putRecord',
    defs: {
      main: {
        type: 'procedure',
        description:
          'Write a repository record, creating or updating it as needed. Requires auth, implemented by PDS.',
        input: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['repo', 'collection', 'rkey', 'record'],
            nullable: ['swapRecord'],
            properties: {
              repo: {
                type: 'string',
                format: 'at-identifier',
                description:
                  'The handle or DID of the repo (aka, current account).',
              },
              collection: {
                type: 'string',
                format: 'nsid',
                description: 'The NSID of the record collection.',
              },
              rkey: {
                type: 'string',
                format: 'record-key',
                description: 'The Record Key.',
                maxLength: 512,
              },
              validate: {
                type: 'boolean',
                description:
                  "Can be set to 'false' to skip Lexicon schema validation of record data, 'true' to require it, or leave unset to validate only for known Lexicons.",
              },
              record: {
                type: 'unknown',
                description: 'The record to write.',
              },
              swapRecord: {
                type: 'string',
                format: 'cid',
                description:
                  'Compare and swap with the previous record by CID. WARNING: nullable and optional field; may cause problems with golang implementation',
              },
              swapCommit: {
                type: 'string',
                format: 'cid',
                description:
                  'Compare and swap with the previous commit by CID.',
              },
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['uri', 'cid'],
            properties: {
              uri: {
                type: 'string',
                format: 'at-uri',
              },
              cid: {
                type: 'string',
                format: 'cid',
              },
              commit: {
                type: 'ref',
                ref: 'lex:com.atproto.repo.defs#commitMeta',
              },
              validationStatus: {
                type: 'string',
                knownValues: ['valid', 'unknown'],
              },
            },
          },
        },
        errors: [
          {
            name: 'InvalidSwap',
          },
        ],
      },
    },
  },
  ComAtprotoRepoStrongRef: {
    lexicon: 1,
    id: 'com.atproto.repo.strongRef',
    description: 'A URI with a content-hash fingerprint.',
    defs: {
      main: {
        type: 'object',
        required: ['uri', 'cid'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          cid: {
            type: 'string',
            format: 'cid',
          },
        },
      },
    },
  },
  ComAtprotoRepoUploadBlob: {
    lexicon: 1,
    id: 'com.atproto.repo.uploadBlob',
    defs: {
      main: {
        type: 'procedure',
        description:
          'Upload a new blob, to be referenced from a repository record. The blob will be deleted if it is not referenced within a time window (eg, minutes). Blob restrictions (mimetype, size, etc) are enforced when the reference is created. Requires auth, implemented by PDS.',
        input: {
          encoding: '*/*',
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['blob'],
            properties: {
              blob: {
                type: 'blob',
              },
            },
          },
        },
      },
    },
  },
  PubLayersAlignmentAlignment: {
    lexicon: 1,
    id: 'pub.layers.alignment.alignment',
    description:
      'Alignment records for parallel structure correspondence. Handles interlinear glossing (Leipzig glossing rules), parallel text alignment (translation), cross-tokenization mapping (word-to-morpheme), audio-text forced alignment, and any many-to-many correspondence between annotation elements or sequences.',
    defs: {
      main: {
        type: 'record',
        description:
          'An alignment between two parallel sequences. The sequences can be tokenizations, annotation layers, expressions (for parallel text), or tiers. Links establish many-to-many correspondence between elements indexed by position.',
        key: 'tid',
        record: {
          type: 'object',
          required: ['kind', 'links', 'createdAt'],
          properties: {
            expression: {
              type: 'string',
              format: 'at-uri',
              description:
                'Primary expression context (for within-document alignments).',
            },
            kindUri: {
              type: 'string',
              format: 'at-uri',
              description:
                'AT-URI of the alignment kind definition node. Community-expandable via knowledge graph.',
            },
            kind: {
              type: 'string',
              description:
                'Alignment kind slug (fallback). The type of alignment.',
              knownValues: [
                'tokenization-to-tokenization',
                'interlinear',
                'parallel-text',
                'audio-to-text',
                'layer-to-layer',
                'error-to-correction',
                'custom',
              ],
              maxLength: 128,
            },
            subkindUri: {
              type: 'string',
              format: 'at-uri',
              description:
                'AT-URI of the alignment subkind definition node. Community-expandable via knowledge graph.',
            },
            subkind: {
              type: 'string',
              description:
                'Alignment subkind slug (fallback). More specific alignment type within the kind.',
              knownValues: [
                'word-to-morpheme',
                'word-to-word',
                'sentence-to-sentence',
                'phrase-to-phrase',
                'morpheme-to-gloss',
                'forced-alignment',
                'manual-alignment',
                'custom',
              ],
              maxLength: 128,
            },
            source: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#objectRef',
              description:
                'Reference to the source sequence. Use localId for within-segmentation tokenization UUID, recordRef for cross-record AT-URI (annotation layer, expression, etc.).',
            },
            target: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#objectRef',
              description:
                'Reference to the target sequence. Use localId for within-segmentation tokenization UUID, recordRef for cross-record AT-URI.',
            },
            sourceLang: {
              type: 'string',
              description:
                'BCP-47 language tag for the source (for parallel text alignment).',
              maxLength: 64,
            },
            targetLang: {
              type: 'string',
              description: 'BCP-47 language tag for the target.',
              maxLength: 64,
            },
            links: {
              type: 'array',
              description: 'The alignment links.',
              items: {
                type: 'ref',
                ref: 'lex:pub.layers.defs#alignmentLink',
              },
            },
            metadata: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#annotationMetadata',
            },
            knowledgeRefs: {
              type: 'array',
              description:
                'Knowledge graph references for this alignment (e.g., alignment model, parallel corpus source).',
              maxLength: 16,
              items: {
                type: 'ref',
                ref: 'lex:pub.layers.defs#knowledgeRef',
              },
            },
            features: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#featureMap',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
          },
        },
      },
    },
  },
  PubLayersAlignmentGetAlignment: {
    lexicon: 1,
    id: 'pub.layers.alignment.getAlignment',
    defs: {
      main: {
        type: 'query',
        description: 'Get a single alignment by its AT-URI.',
        parameters: {
          type: 'params',
          required: ['uri'],
          properties: {
            uri: {
              type: 'string',
              format: 'at-uri',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['uri', 'cid', 'value'],
            properties: {
              uri: {
                type: 'string',
                format: 'at-uri',
              },
              cid: {
                type: 'string',
                format: 'cid',
              },
              value: {
                type: 'ref',
                ref: 'lex:pub.layers.alignment.alignment#main',
              },
            },
          },
        },
        errors: [
          {
            name: 'RecordNotFound',
          },
        ],
      },
    },
  },
  PubLayersAlignmentListAlignments: {
    lexicon: 1,
    id: 'pub.layers.alignment.listAlignments',
    defs: {
      main: {
        type: 'query',
        description: 'List alignments.',
        parameters: {
          type: 'params',
          required: ['expression'],
          properties: {
            expression: {
              type: 'string',
              format: 'at-uri',
            },
            kind: {
              type: 'string',
              maxLength: 128,
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
            },
            cursor: {
              type: 'string',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['records'],
            properties: {
              cursor: {
                type: 'string',
              },
              records: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:pub.layers.alignment.listAlignments#recordView',
                },
              },
            },
          },
        },
      },
      recordView: {
        type: 'object',
        required: ['uri', 'cid', 'value'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          cid: {
            type: 'string',
            format: 'cid',
          },
          value: {
            type: 'ref',
            ref: 'lex:pub.layers.alignment.alignment#main',
          },
        },
      },
    },
  },
  PubLayersAnnotationAnnotationLayer: {
    lexicon: 1,
    id: 'pub.layers.annotation.annotationLayer',
    defs: {
      main: {
        type: 'record',
        description:
          'A named layer of annotations over an expression. All annotation types use this single record type. The combination of kind, subkind, and formalism tells the appview how to render. Multiple layers can coexist for the same expression.',
        key: 'tid',
        record: {
          type: 'object',
          required: ['expression', 'kind', 'annotations', 'createdAt'],
          properties: {
            expression: {
              type: 'string',
              format: 'at-uri',
              description: 'The expression this annotation layer applies to.',
            },
            kindUri: {
              type: 'string',
              format: 'at-uri',
              description:
                'AT-URI of the annotation kind definition node. Community-expandable via knowledge graph.',
            },
            kind: {
              type: 'string',
              description:
                'Primary annotation kind slug (fallback when kindUri unavailable). Determines the structural interpretation of annotations in this layer.',
              knownValues: [
                'token-tag',
                'span',
                'relation',
                'tree',
                'graph',
                'tier',
                'document-tag',
              ],
              maxLength: 128,
            },
            subkindUri: {
              type: 'string',
              format: 'at-uri',
              description:
                'AT-URI of the annotation subkind definition node. Community-expandable via knowledge graph.',
            },
            subkind: {
              type: 'string',
              description:
                'Annotation subkind slug (fallback when subkindUri unavailable). The appview uses this for specialized rendering.',
              knownValues: [
                'pos',
                'xpos',
                'ner',
                'lemma',
                'morph',
                'supersense',
                'sense',
                'chunk',
                'speaker',
                'gloss',
                'phonetic',
                'prosody',
                'tobi',
                'language-id',
                'entity-mention',
                'situation-mention',
                'frame',
                'predicate',
                'discourse-unit',
                'speech-act',
                'temporal-expression',
                'temporal-signal',
                'spatial-expression',
                'spatial-signal',
                'spatial-relation',
                'location-mention',
                'sentiment',
                'emotion',
                'stance',
                'information-structure',
                'error',
                'correction',
                'code-switch',
                'highlight',
                'comment',
                'bookmark',
                'temporal-value',
                'temporal-vagueness',
                'dependency',
                'enhanced-dependency',
                'constituency',
                'ccg',
                'coreference',
                'bridging',
                'temporal-relation',
                'causal-relation',
                'discourse-relation',
                'custom',
              ],
              maxLength: 128,
            },
            formalismUri: {
              type: 'string',
              format: 'at-uri',
              description:
                'AT-URI of the formalism definition node. Community-expandable via knowledge graph.',
            },
            formalism: {
              type: 'string',
              description:
                'Formalism slug (fallback when formalismUri unavailable). The linguistic formalism or annotation standard used.',
              knownValues: [
                'universal-dependencies',
                'penn-treebank',
                'stanford',
                'prague',
                'propbank',
                'framenet',
                'verbnet',
                'amr',
                'ucca',
                'rst',
                'erst',
                'sdrt',
                'pdtb',
                'timeml',
                'iso-space',
                'spatialml',
                'conll-u',
                'brat',
                'elan',
                'leipzig-glossing',
                'ipa',
                'tobi',
                'bpe',
                'sentencepiece',
                'unimorph',
                'wals',
                'custom',
              ],
              maxLength: 128,
            },
            sourceMethodUri: {
              type: 'string',
              format: 'at-uri',
              description:
                'AT-URI of the annotation source method definition node. Community-expandable via knowledge graph.',
            },
            sourceMethod: {
              type: 'string',
              description:
                "How this annotation layer was produced (fallback when sourceMethodUri unavailable). Follows UD's per-layer annotation source tracking.",
              knownValues: [
                'manual-native',
                'manual-corrected',
                'automatic',
                'automatic-corrected',
                'converted',
                'converted-corrected',
                'crowd-sourced',
                'custom',
              ],
              maxLength: 128,
            },
            labelSet: {
              type: 'string',
              description:
                "Identifier for the label set used (e.g., 'universal-pos', 'ontonotes-ner', 'penn-treebank-pos').",
              maxLength: 256,
            },
            ontologyRef: {
              type: 'string',
              format: 'at-uri',
              description:
                'Reference to a pub.layers.ontology defining the types used in this layer.',
            },
            tokenizationId: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#uuid',
              description:
                'For token-aligned layers (kind=token-tag, dependency, constituency, etc.): the tokenization these annotations are aligned to.',
            },
            rank: {
              type: 'integer',
              description: 'Rank among k-best alternatives (1 = best).',
              minimum: 1,
            },
            alternativesRef: {
              type: 'string',
              format: 'at-uri',
              description:
                'Reference to the top-ranked layer in a k-best group.',
            },
            parentLayerRef: {
              type: 'string',
              format: 'at-uri',
              description:
                'For dependent/subordinate layers: the parent layer this one subdivides or refines. Supports ELAN-style tier dependencies, error-correction pairs, etc.',
            },
            language: {
              type: 'string',
              description:
                "BCP-47 language tag for this annotation layer, if different from the expression's language.",
              maxLength: 64,
            },
            annotations: {
              type: 'array',
              description: 'The annotations in this layer.',
              items: {
                type: 'ref',
                ref: 'lex:pub.layers.annotation.defs#annotation',
              },
            },
            metadata: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#annotationMetadata',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
          },
        },
      },
    },
  },
  PubLayersAnnotationClusterSet: {
    lexicon: 1,
    id: 'pub.layers.annotation.clusterSet',
    defs: {
      main: {
        type: 'record',
        description:
          'Groups annotations into equivalence classes. Used for coreference resolution (entity clusters, situation clusters), bridging anaphora grouping, and any annotation clustering task.',
        key: 'tid',
        record: {
          type: 'object',
          required: ['kind', 'clusters', 'createdAt'],
          properties: {
            expression: {
              type: 'string',
              format: 'at-uri',
              description:
                'Primary expression context. Optional for cross-document clustering.',
            },
            expressionRefs: {
              type: 'array',
              description:
                'For cross-document clustering: all expressions these clusters span.',
              maxLength: 10000,
              items: {
                type: 'string',
                format: 'at-uri',
              },
            },
            corpusRef: {
              type: 'string',
              format: 'at-uri',
              description:
                'Corpus these clusters span (for cross-document clustering).',
            },
            kindUri: {
              type: 'string',
              format: 'at-uri',
              description:
                'AT-URI of the clustering kind definition node. Community-expandable via knowledge graph.',
            },
            kind: {
              type: 'string',
              description:
                'Clustering kind slug (fallback when kindUri unavailable).',
              knownValues: [
                'coreference',
                'situation-coreference',
                'bridging',
                'same-as',
                'clustering',
                'custom',
              ],
              maxLength: 128,
            },
            layerRef: {
              type: 'string',
              format: 'at-uri',
              description:
                'The annotation layer whose annotations these clusters group.',
            },
            clusters: {
              type: 'array',
              items: {
                type: 'ref',
                ref: 'lex:pub.layers.annotation.defs#cluster',
              },
            },
            metadata: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#annotationMetadata',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
          },
        },
      },
    },
  },
  PubLayersAnnotationDefs: {
    lexicon: 1,
    id: 'pub.layers.annotation.defs',
    defs: {
      annotation: {
        type: 'object',
        description:
          "A single abstract annotation. The fields populated depend on the layer's kind/subkind. For token-tags: tokenIndex + label. For spans: anchor + label. For trees: anchor + label + parentId/childIds. For relations: anchor + arguments. For graphs: anchor + arguments or headIndex/targetIndex. This single type replaces the former tag, spanAnnotation, entityMention, situationMention, dependencyArc, parseNode, etc.",
        required: ['uuid'],
        properties: {
          uuid: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#uuid',
          },
          anchor: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#anchor',
            description: 'How this annotation attaches to the source data.',
          },
          tokenIndex: {
            type: 'integer',
            description:
              'For token-level annotations: 0-based index into the tokenization.',
            minimum: 0,
          },
          label: {
            type: 'string',
            description:
              'The primary label (POS tag, entity type, frame name, constituent label, dependency relation, etc.).',
            maxLength: 512,
          },
          value: {
            type: 'string',
            description:
              'Secondary value (lemma form, gloss, normalized temporal value, etc.).',
            maxLength: 4096,
          },
          text: {
            type: 'string',
            description: 'Surface text of the annotated span.',
            maxLength: 4096,
          },
          parentId: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#uuid',
            description:
              'Parent annotation in tree structures (constituency, RST, etc.).',
          },
          childIds: {
            type: 'array',
            description: 'Child annotation UUIDs in tree structures.',
            items: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#uuid',
            },
          },
          headIndex: {
            type: 'integer',
            description:
              'Head/governor token index for directed arcs (dependency parsing). -1 for root.',
            minimum: -1,
          },
          targetIndex: {
            type: 'integer',
            description: 'Dependent/target token index for directed arcs.',
            minimum: 0,
          },
          arguments: {
            type: 'array',
            description:
              'Role/argument fillers for predicate-argument structures (FrameNet, PropBank, AMR, etc.). Each argument references another annotation.',
            items: {
              type: 'ref',
              ref: 'lex:pub.layers.annotation.defs#argumentRef',
            },
          },
          confidence: {
            type: 'integer',
            description: 'Confidence score 0-1000.',
            minimum: 0,
            maximum: 1000,
          },
          ontologyTypeRef: {
            type: 'string',
            format: 'at-uri',
            description:
              'Reference to a type definition in a pub.layers.ontology.',
          },
          knowledgeRefs: {
            type: 'array',
            description: 'Links to external knowledge bases.',
            maxLength: 32,
            items: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#knowledgeRef',
            },
          },
          temporal: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#temporalExpression',
            description:
              'Structured temporal annotation. For temporal-expression, temporal-value, and temporal-vagueness subkinds. Subsumes TimeML TIMEX3 and OWL-Time GeneralDateTimeDescription.',
          },
          spatial: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#spatialExpression',
            description:
              'Structured spatial annotation. For spatial-expression and location-mention subkinds. Subsumes ISO-Space place annotations (ISO 24617-7), SpatialML PLACE elements, and GeoJSON/WKT geometries.',
          },
          features: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#featureMap',
            description:
              'Open-ended features. Use for domain-specific properties: phraseType, polarity, modality, tense, isEnhanced, morphological features, etc.',
          },
        },
      },
      argumentRef: {
        type: 'object',
        description:
          'A role/argument reference in a predicate-argument structure. Uses the composable objectRef to point to another annotation, either locally (same layer, by UUID) or remotely (cross-layer or cross-record, by AT-URI + UUID).',
        required: ['role', 'target'],
        properties: {
          role: {
            type: 'string',
            description:
              'The argument role label (e.g., ARG0, Agent, Theme, CAUSE, connective, etc.).',
            maxLength: 256,
          },
          target: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#objectRef',
            description:
              'Reference to the annotation filling this role. Use localId for same-layer, recordRef+objectId for cross-layer.',
          },
          features: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#featureMap',
          },
        },
      },
      cluster: {
        type: 'object',
        description:
          'A cluster of annotations (e.g., coreferent entity mentions, situation mentions referring to the same situation).',
        required: ['uuid', 'members'],
        properties: {
          uuid: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#uuid',
          },
          canonicalLabel: {
            type: 'string',
            description: 'The canonical/representative label for this cluster.',
            maxLength: 1024,
          },
          members: {
            type: 'array',
            description:
              'References to the annotations in this cluster. Use localId for same-layer members, recordRef+objectId for cross-layer or cross-document coreference.',
            items: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#objectRef',
            },
          },
          knowledgeRefs: {
            type: 'array',
            maxLength: 32,
            items: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#knowledgeRef',
            },
          },
          features: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#featureMap',
          },
        },
      },
    },
  },
  PubLayersAnnotationGetAnnotationLayer: {
    lexicon: 1,
    id: 'pub.layers.annotation.getAnnotationLayer',
    defs: {
      main: {
        type: 'query',
        description: 'Get a single annotation layer by its AT-URI.',
        parameters: {
          type: 'params',
          required: ['uri'],
          properties: {
            uri: {
              type: 'string',
              format: 'at-uri',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['uri', 'cid', 'value'],
            properties: {
              uri: {
                type: 'string',
                format: 'at-uri',
              },
              cid: {
                type: 'string',
                format: 'cid',
              },
              value: {
                type: 'ref',
                ref: 'lex:pub.layers.annotation.annotationLayer#main',
              },
            },
          },
        },
        errors: [
          {
            name: 'RecordNotFound',
          },
        ],
      },
    },
  },
  PubLayersAnnotationGetClusterSet: {
    lexicon: 1,
    id: 'pub.layers.annotation.getClusterSet',
    defs: {
      main: {
        type: 'query',
        description: 'Get a single cluster set by its AT-URI.',
        parameters: {
          type: 'params',
          required: ['uri'],
          properties: {
            uri: {
              type: 'string',
              format: 'at-uri',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['uri', 'cid', 'value'],
            properties: {
              uri: {
                type: 'string',
                format: 'at-uri',
              },
              cid: {
                type: 'string',
                format: 'cid',
              },
              value: {
                type: 'ref',
                ref: 'lex:pub.layers.annotation.clusterSet#main',
              },
            },
          },
        },
        errors: [
          {
            name: 'RecordNotFound',
          },
        ],
      },
    },
  },
  PubLayersAnnotationListAnnotationLayers: {
    lexicon: 1,
    id: 'pub.layers.annotation.listAnnotationLayers',
    defs: {
      main: {
        type: 'query',
        description: 'List annotation layers.',
        parameters: {
          type: 'params',
          required: ['expression'],
          properties: {
            expression: {
              type: 'string',
              format: 'at-uri',
            },
            kind: {
              type: 'string',
            },
            subkind: {
              type: 'string',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
            },
            cursor: {
              type: 'string',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['records'],
            properties: {
              cursor: {
                type: 'string',
              },
              records: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:pub.layers.annotation.listAnnotationLayers#recordView',
                },
              },
            },
          },
        },
      },
      recordView: {
        type: 'object',
        required: ['uri', 'cid', 'value'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          cid: {
            type: 'string',
            format: 'cid',
          },
          value: {
            type: 'ref',
            ref: 'lex:pub.layers.annotation.annotationLayer#main',
          },
        },
      },
    },
  },
  PubLayersAnnotationListClusterSets: {
    lexicon: 1,
    id: 'pub.layers.annotation.listClusterSets',
    defs: {
      main: {
        type: 'query',
        description: 'List cluster sets.',
        parameters: {
          type: 'params',
          required: ['expression'],
          properties: {
            expression: {
              type: 'string',
              format: 'at-uri',
            },
            kind: {
              type: 'string',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
            },
            cursor: {
              type: 'string',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['records'],
            properties: {
              cursor: {
                type: 'string',
              },
              records: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:pub.layers.annotation.listClusterSets#recordView',
                },
              },
            },
          },
        },
      },
      recordView: {
        type: 'object',
        required: ['uri', 'cid', 'value'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          cid: {
            type: 'string',
            format: 'cid',
          },
          value: {
            type: 'ref',
            ref: 'lex:pub.layers.annotation.clusterSet#main',
          },
        },
      },
    },
  },
  PubLayersChangelogDefs: {
    lexicon: 1,
    id: 'pub.layers.changelog.defs',
    defs: {
      semanticVersion: {
        type: 'object',
        description:
          'A semantic version following the major.minor.patch convention.',
        required: ['major', 'minor', 'patch'],
        properties: {
          major: {
            type: 'integer',
            description: 'Major version number.',
            minimum: 0,
          },
          minor: {
            type: 'integer',
            description: 'Minor version number.',
            minimum: 0,
          },
          patch: {
            type: 'integer',
            description: 'Patch version number.',
            minimum: 0,
          },
        },
      },
      changeSection: {
        type: 'object',
        description: 'A group of changes under a single category.',
        required: ['category', 'items'],
        properties: {
          category: {
            type: 'string',
            description: 'Category of changes.',
            knownValues: [
              'annotations',
              'segmentation',
              'text',
              'ontology',
              'corpus',
              'alignment',
              'graph',
              'experiment',
              'resource',
              'media',
              'provenance',
              'references',
              'corrections',
              'other',
            ],
            maxLength: 128,
          },
          items: {
            type: 'array',
            description: 'Individual change items in this section.',
            maxLength: 50,
            items: {
              type: 'ref',
              ref: 'lex:pub.layers.changelog.defs#changeItem',
            },
          },
        },
      },
      changeItem: {
        type: 'object',
        description:
          'An individual change entry. The targets field uses objectRef for machine-readable sub-record targeting, allowing a change item to point at specific objects within the subject record.',
        required: ['description'],
        properties: {
          description: {
            type: 'string',
            description: 'Description of the change.',
            maxLength: 2000,
          },
          changeType: {
            type: 'string',
            description: 'Type of change.',
            knownValues: ['added', 'changed', 'removed', 'fixed', 'deprecated'],
            maxLength: 32,
          },
          targets: {
            type: 'array',
            description:
              'Specific objects that changed. Uses recordRef + objectId for sub-record targeting (e.g., a specific annotation within an annotation layer).',
            maxLength: 20,
            items: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#objectRef',
            },
          },
          fieldPath: {
            type: 'string',
            description:
              "Path to the changed field within the target (e.g., 'annotations/3/label', 'formalism', 'annotationDesign/guidelinesRef').",
            maxLength: 200,
          },
          previousValue: {
            type: 'string',
            description: 'Previous value as a display string.',
            maxLength: 1000,
          },
          newValue: {
            type: 'string',
            description: 'New value as a display string.',
            maxLength: 1000,
          },
        },
      },
    },
  },
  PubLayersChangelogEntry: {
    lexicon: 1,
    id: 'pub.layers.changelog.entry',
    defs: {
      main: {
        type: 'record',
        description:
          'A changelog entry describing changes to any Layers record.',
        key: 'tid',
        record: {
          type: 'object',
          required: [
            'subject',
            'subjectCollection',
            'summary',
            'sections',
            'createdAt',
          ],
          properties: {
            subject: {
              type: 'string',
              format: 'at-uri',
              description:
                'AT-URI of the record this changelog describes (any pub.layers.* record).',
            },
            subjectCollection: {
              type: 'string',
              description:
                "The NSID of the subject record's collection (e.g., 'pub.layers.annotation.annotationLayer'). Enables efficient filtering by record type without resolving the AT-URI.",
              maxLength: 256,
            },
            version: {
              type: 'ref',
              ref: 'lex:pub.layers.changelog.defs#semanticVersion',
              description: 'Semantic version this changelog describes.',
            },
            previousVersion: {
              type: 'ref',
              ref: 'lex:pub.layers.changelog.defs#semanticVersion',
              description: 'Previous semantic version.',
            },
            summary: {
              type: 'string',
              description: 'One-line summary of changes.',
              maxLength: 500,
            },
            sections: {
              type: 'array',
              description: 'Categorized change sections.',
              maxLength: 20,
              items: {
                type: 'ref',
                ref: 'lex:pub.layers.changelog.defs#changeSection',
              },
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
              description: 'When this changelog entry was created.',
            },
          },
        },
      },
    },
  },
  PubLayersChangelogGetEntry: {
    lexicon: 1,
    id: 'pub.layers.changelog.getEntry',
    defs: {
      main: {
        type: 'query',
        description: 'Get a single changelog entry by its AT-URI.',
        parameters: {
          type: 'params',
          required: ['uri'],
          properties: {
            uri: {
              type: 'string',
              format: 'at-uri',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['uri', 'cid', 'value'],
            properties: {
              uri: {
                type: 'string',
                format: 'at-uri',
              },
              cid: {
                type: 'string',
                format: 'cid',
              },
              value: {
                type: 'ref',
                ref: 'lex:pub.layers.changelog.entry#main',
              },
            },
          },
        },
        errors: [
          {
            name: 'RecordNotFound',
          },
        ],
      },
    },
  },
  PubLayersChangelogListByCollection: {
    lexicon: 1,
    id: 'pub.layers.changelog.listByCollection',
    defs: {
      main: {
        type: 'query',
        description:
          'List recent changelog entries across all records of a given collection type, ordered newest first.',
        parameters: {
          type: 'params',
          required: ['collection'],
          properties: {
            collection: {
              type: 'string',
              description:
                "The NSID of the collection to filter by (e.g., 'pub.layers.annotation.annotationLayer').",
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
            },
            cursor: {
              type: 'string',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['entries'],
            properties: {
              cursor: {
                type: 'string',
              },
              entries: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:pub.layers.changelog.listByCollection#recordView',
                },
              },
            },
          },
        },
      },
      recordView: {
        type: 'object',
        required: ['uri', 'cid', 'value'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          cid: {
            type: 'string',
            format: 'cid',
          },
          value: {
            type: 'ref',
            ref: 'lex:pub.layers.changelog.entry#main',
          },
        },
      },
    },
  },
  PubLayersChangelogListEntries: {
    lexicon: 1,
    id: 'pub.layers.changelog.listEntries',
    defs: {
      main: {
        type: 'query',
        description:
          'List changelog entries for a specific subject record, ordered newest first.',
        parameters: {
          type: 'params',
          required: ['subject'],
          properties: {
            subject: {
              type: 'string',
              format: 'at-uri',
              description:
                'AT-URI of the subject record to list changelogs for.',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
            },
            cursor: {
              type: 'string',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['entries'],
            properties: {
              cursor: {
                type: 'string',
              },
              entries: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:pub.layers.changelog.listEntries#recordView',
                },
              },
            },
          },
        },
      },
      recordView: {
        type: 'object',
        required: ['uri', 'cid', 'value'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          cid: {
            type: 'string',
            format: 'cid',
          },
          value: {
            type: 'ref',
            ref: 'lex:pub.layers.changelog.entry#main',
          },
        },
      },
    },
  },
  PubLayersCorpusCorpus: {
    lexicon: 1,
    id: 'pub.layers.corpus.corpus',
    defs: {
      main: {
        type: 'record',
        description: 'A corpus: a curated collection of expressions.',
        key: 'tid',
        record: {
          type: 'object',
          required: ['name', 'createdAt'],
          properties: {
            name: {
              type: 'string',
              description: 'Corpus name.',
              maxLength: 512,
            },
            description: {
              type: 'string',
              maxLength: 50000,
            },
            version: {
              type: 'string',
              maxLength: 64,
            },
            language: {
              type: 'string',
              description: 'Primary BCP-47 language tag.',
              maxLength: 32,
            },
            languages: {
              type: 'array',
              description: 'All languages represented.',
              maxLength: 128,
              items: {
                type: 'string',
                maxLength: 32,
              },
            },
            domainUri: {
              type: 'string',
              format: 'at-uri',
              description:
                'AT-URI of the domain definition node. Community-expandable via knowledge graph.',
            },
            domain: {
              type: 'string',
              description: 'Domain slug (fallback when domainUri unavailable).',
              knownValues: [
                'news',
                'biomedical',
                'legal',
                'social-media',
                'dialogue',
                'literary',
                'scientific',
                'web',
                'spoken',
                'custom',
              ],
              maxLength: 256,
            },
            license: {
              type: 'string',
              description:
                "License identifier (e.g., 'CC-BY-4.0', 'LDC-User-Agreement').",
              maxLength: 256,
            },
            ontologyRefs: {
              type: 'array',
              description: 'Ontologies used in this corpus.',
              maxLength: 32,
              items: {
                type: 'string',
                format: 'at-uri',
              },
            },
            eprintRefs: {
              type: 'array',
              description: 'Eprint links for this corpus.',
              maxLength: 64,
              items: {
                type: 'string',
                format: 'at-uri',
              },
            },
            expressionCount: {
              type: 'integer',
              description: 'Number of expressions in the corpus.',
              minimum: 0,
            },
            annotationDesign: {
              type: 'ref',
              ref: 'lex:pub.layers.corpus.defs#annotationDesign',
              description:
                'Annotation project design: annotator assignment, adjudication, and quality criteria.',
            },
            features: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#featureMap',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
          },
        },
      },
    },
  },
  PubLayersCorpusDefs: {
    lexicon: 1,
    id: 'pub.layers.corpus.defs',
    defs: {
      annotationDesign: {
        type: 'object',
        description:
          'Annotation project design parameters: annotator assignment, adjudication, and quality criteria.',
        properties: {
          redundancy: {
            type: 'ref',
            ref: 'lex:pub.layers.corpus.defs#redundancySpec',
            description: 'How annotators are assigned to items.',
          },
          adjudication: {
            type: 'ref',
            ref: 'lex:pub.layers.corpus.defs#adjudicationSpec',
            description: 'How disagreements are resolved.',
          },
          qualityCriteria: {
            type: 'array',
            description: 'Acceptance criteria for annotation quality.',
            maxLength: 32,
            items: {
              type: 'ref',
              ref: 'lex:pub.layers.corpus.defs#qualityCriterion',
            },
          },
          guidelinesRef: {
            type: 'string',
            format: 'at-uri',
            description:
              'AT-URI of the annotation guidelines document (e.g., a pub.layers.persona or external resource).',
          },
          guidelinesVersion: {
            type: 'string',
            description: 'Version identifier for the annotation guidelines.',
            maxLength: 64,
          },
          annotationRounds: {
            type: 'integer',
            description: 'Number of annotation passes in the project workflow.',
            minimum: 1,
          },
          features: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#featureMap',
          },
        },
      },
      redundancySpec: {
        type: 'object',
        description:
          'How many annotators work on each item and how they are assigned.',
        properties: {
          count: {
            type: 'integer',
            description: 'Number of independent annotators per item.',
            minimum: 0,
          },
          assignmentStrategyUri: {
            type: 'string',
            format: 'at-uri',
            description:
              'AT-URI of the assignment strategy definition node. Community-expandable via knowledge graph.',
          },
          assignmentStrategy: {
            type: 'string',
            description:
              'How annotators are assigned to items (fallback when assignmentStrategyUri unavailable).',
            knownValues: [
              'random',
              'round-robin',
              'stratified',
              'expertise-based',
              'custom',
            ],
            maxLength: 128,
          },
          annotatorPool: {
            type: 'integer',
            description: 'Total number of annotators in the project.',
            minimum: 0,
          },
          features: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#featureMap',
          },
        },
      },
      adjudicationSpec: {
        type: 'object',
        description:
          'How disagreements between annotators are resolved into a final annotation.',
        properties: {
          methodUri: {
            type: 'string',
            format: 'at-uri',
            description:
              'AT-URI of the adjudication method definition node. Community-expandable via knowledge graph.',
          },
          method: {
            type: 'string',
            description:
              'Adjudication method (fallback when methodUri unavailable).',
            knownValues: [
              'expert',
              'majority-vote',
              'unanimous',
              'discussion',
              'dawid-skene',
              'automatic-merge',
              'intersection',
              'union',
              'none',
              'custom',
            ],
            maxLength: 128,
          },
          dedicatedAdjudicator: {
            type: 'boolean',
            description:
              'Whether a separate adjudicator (not one of the annotators) resolves disagreements.',
          },
          agreementThreshold: {
            type: 'integer',
            description:
              'Agreement level (0-1000) above which adjudication is skipped.',
            minimum: 0,
            maximum: 1000,
          },
          features: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#featureMap',
          },
        },
      },
      qualityCriterion: {
        type: 'object',
        description: 'An acceptance criterion for annotation quality.',
        required: ['metric'],
        properties: {
          metricUri: {
            type: 'string',
            format: 'at-uri',
            description:
              'AT-URI of the metric definition node. Community-expandable via knowledge graph.',
          },
          metric: {
            type: 'string',
            description:
              'Agreement or quality metric (fallback when metricUri unavailable).',
            knownValues: [
              'cohens-kappa',
              'fleiss-kappa',
              'krippendorff-alpha',
              'percent-agreement',
              'f1',
              'smatch',
              'uas',
              'las',
              'correlation',
              'custom',
            ],
            maxLength: 128,
          },
          threshold: {
            type: 'integer',
            description: 'Minimum acceptable metric value (0-1000).',
            minimum: 0,
            maximum: 1000,
          },
          scopeUri: {
            type: 'string',
            format: 'at-uri',
            description:
              'AT-URI of the evaluation scope definition node. Community-expandable via knowledge graph.',
          },
          scope: {
            type: 'string',
            description:
              'Evaluation scope (fallback when scopeUri unavailable).',
            knownValues: ['item', 'layer', 'document', 'corpus', 'custom'],
            maxLength: 128,
          },
          features: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#featureMap',
          },
        },
      },
    },
  },
  PubLayersCorpusGetCorpus: {
    lexicon: 1,
    id: 'pub.layers.corpus.getCorpus',
    defs: {
      main: {
        type: 'query',
        description: 'Get a single corpus by its AT-URI.',
        parameters: {
          type: 'params',
          required: ['uri'],
          properties: {
            uri: {
              type: 'string',
              format: 'at-uri',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['uri', 'cid', 'value'],
            properties: {
              uri: {
                type: 'string',
                format: 'at-uri',
              },
              cid: {
                type: 'string',
                format: 'cid',
              },
              value: {
                type: 'ref',
                ref: 'lex:pub.layers.corpus.corpus#main',
              },
            },
          },
        },
        errors: [
          {
            name: 'RecordNotFound',
          },
        ],
      },
    },
  },
  PubLayersCorpusGetMembership: {
    lexicon: 1,
    id: 'pub.layers.corpus.getMembership',
    defs: {
      main: {
        type: 'query',
        description: 'Get a single membership by its AT-URI.',
        parameters: {
          type: 'params',
          required: ['uri'],
          properties: {
            uri: {
              type: 'string',
              format: 'at-uri',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['uri', 'cid', 'value'],
            properties: {
              uri: {
                type: 'string',
                format: 'at-uri',
              },
              cid: {
                type: 'string',
                format: 'cid',
              },
              value: {
                type: 'ref',
                ref: 'lex:pub.layers.corpus.membership#main',
              },
            },
          },
        },
        errors: [
          {
            name: 'RecordNotFound',
          },
        ],
      },
    },
  },
  PubLayersCorpusListCorpora: {
    lexicon: 1,
    id: 'pub.layers.corpus.listCorpora',
    defs: {
      main: {
        type: 'query',
        description: 'List corpora.',
        parameters: {
          type: 'params',
          required: ['repo'],
          properties: {
            repo: {
              type: 'string',
              format: 'at-identifier',
            },
            language: {
              type: 'string',
            },
            domain: {
              type: 'string',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
            },
            cursor: {
              type: 'string',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['records'],
            properties: {
              cursor: {
                type: 'string',
              },
              records: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:pub.layers.corpus.listCorpora#recordView',
                },
              },
            },
          },
        },
      },
      recordView: {
        type: 'object',
        required: ['uri', 'cid', 'value'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          cid: {
            type: 'string',
            format: 'cid',
          },
          value: {
            type: 'ref',
            ref: 'lex:pub.layers.corpus.corpus#main',
          },
        },
      },
    },
  },
  PubLayersCorpusListMemberships: {
    lexicon: 1,
    id: 'pub.layers.corpus.listMemberships',
    defs: {
      main: {
        type: 'query',
        description: 'List memberships.',
        parameters: {
          type: 'params',
          required: ['corpusRef'],
          properties: {
            corpusRef: {
              type: 'string',
              format: 'at-uri',
            },
            split: {
              type: 'string',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
            },
            cursor: {
              type: 'string',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['records'],
            properties: {
              cursor: {
                type: 'string',
              },
              records: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:pub.layers.corpus.listMemberships#recordView',
                },
              },
            },
          },
        },
      },
      recordView: {
        type: 'object',
        required: ['uri', 'cid', 'value'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          cid: {
            type: 'string',
            format: 'cid',
          },
          value: {
            type: 'ref',
            ref: 'lex:pub.layers.corpus.membership#main',
          },
        },
      },
    },
  },
  PubLayersCorpusMembership: {
    lexicon: 1,
    id: 'pub.layers.corpus.membership',
    defs: {
      main: {
        type: 'record',
        description:
          'A record indicating that a expression belongs to a corpus, with optional split assignment.',
        key: 'tid',
        record: {
          type: 'object',
          required: ['corpusRef', 'expressionRef', 'createdAt'],
          properties: {
            corpusRef: {
              type: 'string',
              format: 'at-uri',
            },
            expressionRef: {
              type: 'string',
              format: 'at-uri',
            },
            splitUri: {
              type: 'string',
              format: 'at-uri',
              description:
                'AT-URI of the split definition node. Community-expandable via knowledge graph.',
            },
            split: {
              type: 'string',
              description: 'Split slug (fallback when splitUri unavailable).',
              knownValues: ['train', 'dev', 'test', 'unlabeled'],
              maxLength: 64,
            },
            ordinal: {
              type: 'integer',
              description: 'Ordering index within the corpus.',
              minimum: 0,
            },
            metadata: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#annotationMetadata',
              description:
                'Provenance: who assigned this expression to this corpus, when, with what tool.',
            },
            features: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#featureMap',
              description:
                'Open-ended features for this membership (e.g., source file, import batch, quality flags).',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
          },
        },
      },
    },
  },
  PubLayersDefs: {
    lexicon: 1,
    id: 'pub.layers.defs',
    description:
      'Shared definitions for the Layers lexicons. Provides abstract anchoring primitives, W3C Web Annotation-compatible selectors (for at.margin/Semble interoperability), alignment links, and universal metadata types.',
    defs: {
      uuid: {
        type: 'object',
        description:
          'A universally unique identifier for cross-referencing annotation objects.',
        required: ['value'],
        properties: {
          value: {
            type: 'string',
            description: 'The UUID string value.',
            minLength: 1,
            maxLength: 64,
          },
        },
      },
      span: {
        type: 'object',
        description: 'A contiguous span of text defined by UTF-8 byte offsets.',
        required: ['byteStart', 'byteEnd'],
        properties: {
          byteStart: {
            type: 'integer',
            description: 'Inclusive start UTF-8 byte offset (0-indexed).',
            minimum: 0,
          },
          byteEnd: {
            type: 'integer',
            description: 'Exclusive end UTF-8 byte offset.',
            minimum: 0,
          },
          charStart: {
            type: 'integer',
            description:
              'Inclusive start character offset. Optional; for compatibility with character-offset datasets.',
            minimum: 0,
          },
          charEnd: {
            type: 'integer',
            description:
              'Exclusive end character offset. Optional; for compatibility with character-offset datasets.',
            minimum: 0,
          },
        },
      },
      tokenRef: {
        type: 'object',
        description:
          'A reference to a specific token within a tokenization, by index.',
        required: ['tokenizationId', 'tokenIndex'],
        properties: {
          tokenizationId: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#uuid',
            description:
              'UUID of the tokenization containing the referenced token.',
          },
          tokenIndex: {
            type: 'integer',
            description: '0-based index of the token within its tokenization.',
            minimum: 0,
          },
        },
      },
      tokenRefSequence: {
        type: 'object',
        description:
          'A sequence of token references, possibly non-contiguous, within a single tokenization.',
        required: ['tokenizationId', 'tokenIndexes'],
        properties: {
          tokenizationId: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#uuid',
            description:
              'UUID of the tokenization containing the referenced tokens.',
          },
          tokenIndexes: {
            type: 'array',
            description: '0-based indices of the tokens.',
            items: {
              type: 'integer',
              minimum: 0,
            },
          },
          anchorTokenIndex: {
            type: 'integer',
            description:
              'Optional head/anchor token index within the sequence.',
            minimum: 0,
          },
        },
      },
      temporalSpan: {
        type: 'object',
        description:
          'A temporal span within a media source, defined by start and end times in milliseconds.',
        required: ['start', 'ending'],
        properties: {
          start: {
            type: 'integer',
            description: 'Start time in milliseconds.',
            minimum: 0,
          },
          ending: {
            type: 'integer',
            description: 'End time in milliseconds.',
            minimum: 0,
          },
        },
      },
      boundingBox: {
        type: 'object',
        description:
          'A spatial bounding box for image or video frame annotation.',
        required: ['x', 'y', 'width', 'height'],
        properties: {
          x: {
            type: 'integer',
            description: 'X coordinate of top-left corner in pixels.',
          },
          y: {
            type: 'integer',
            description: 'Y coordinate of top-left corner in pixels.',
          },
          width: {
            type: 'integer',
            description: 'Width in pixels.',
            minimum: 1,
          },
          height: {
            type: 'integer',
            description: 'Height in pixels.',
            minimum: 1,
          },
        },
      },
      spatioTemporalAnchor: {
        type: 'object',
        description:
          'Combined spatial and temporal anchor for video annotation with keyframe-based tracking.',
        required: ['temporalSpan'],
        properties: {
          temporalSpan: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#temporalSpan',
          },
          keyframes: {
            type: 'array',
            description:
              'Keyframes defining spatial positions at specific times.',
            items: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#keyframe',
            },
          },
          interpolationUri: {
            type: 'string',
            format: 'at-uri',
            description:
              'AT-URI of the interpolation mode definition node. Community-expandable via knowledge graph.',
          },
          interpolation: {
            type: 'string',
            description:
              'Interpolation mode slug (fallback when interpolationUri unavailable).',
            knownValues: ['linear', 'step', 'cubic'],
          },
        },
      },
      keyframe: {
        type: 'object',
        description: 'A spatial annotation at a specific time point.',
        required: ['timeMs', 'bbox'],
        properties: {
          timeMs: {
            type: 'integer',
            description: 'Time in milliseconds.',
            minimum: 0,
          },
          bbox: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#boundingBox',
          },
          features: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#featureMap',
            description:
              'Per-keyframe features (e.g., visibility, occlusion percentage, confidence, pose data).',
          },
        },
      },
      temporalEntity: {
        type: 'object',
        description:
          'A normalized temporal value representing a point, interval, duration, or uncertain range in calendar/clock time. Subsumes OWL-Time TemporalEntity (Instant, Interval, Duration) and TimeML TIMEX3 value. Consumers dispatch on which fields are populated: instant only (point), intervalStart+intervalEnd (bounded interval), duration only (pure duration), earliest+latest (uncertain bounds), recurrence (repeating pattern).',
        properties: {
          instant: {
            type: 'string',
            description:
              "Point in time as ISO 8601 datetime (e.g., '2024-03-15', '2024-03-15T14:30:00Z'). Maps to OWL-Time Instant.",
            maxLength: 64,
          },
          intervalStart: {
            type: 'string',
            description:
              'Interval start as ISO 8601 datetime. Maps to OWL-Time hasBeginning.',
            maxLength: 64,
          },
          intervalEnd: {
            type: 'string',
            description:
              'Interval end as ISO 8601 datetime. Maps to OWL-Time hasEnd.',
            maxLength: 64,
          },
          duration: {
            type: 'string',
            description:
              "Duration as ISO 8601 duration (e.g., 'P3Y', 'PT2H30M', 'P1DT12H'). Maps to OWL-Time hasTemporalDuration.",
            maxLength: 64,
          },
          earliest: {
            type: 'string',
            description:
              'Lower bound for uncertain or vague times, as ISO 8601 datetime.',
            maxLength: 64,
          },
          latest: {
            type: 'string',
            description:
              'Upper bound for uncertain or vague times, as ISO 8601 datetime.',
            maxLength: 64,
          },
          granularityUri: {
            type: 'string',
            format: 'at-uri',
            description:
              'AT-URI of the granularity definition node. Community-expandable via knowledge graph.',
          },
          granularity: {
            type: 'string',
            description:
              'Temporal granularity slug (fallback when granularityUri unavailable). Maps to OWL-Time unitType.',
            knownValues: [
              'millennium',
              'century',
              'decade',
              'year',
              'quarter',
              'month',
              'week',
              'day',
              'hour',
              'minute',
              'second',
              'millisecond',
              'custom',
            ],
            maxLength: 64,
          },
          calendarUri: {
            type: 'string',
            format: 'at-uri',
            description:
              'AT-URI of the calendar system definition node. Community-expandable via knowledge graph.',
          },
          calendar: {
            type: 'string',
            description:
              'Calendar system slug (fallback when calendarUri unavailable). Maps to OWL-Time TRS (Temporal Reference System).',
            knownValues: [
              'gregorian',
              'julian',
              'hijri',
              'hebrew',
              'iso-week',
              'unix',
              'japanese-imperial',
              'buddhist',
              'coptic',
              'custom',
            ],
            maxLength: 64,
          },
          recurrence: {
            type: 'string',
            description:
              "ISO 8601 repeating interval (e.g., 'R/P1W' for weekly, 'R5/P1D' for 5 daily repetitions).",
            maxLength: 128,
          },
          features: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#featureMap',
          },
        },
      },
      temporalModifier: {
        type: 'object',
        description:
          'Qualitative modification of a temporal value. Subsumes TimeML TIMEX3 mod attribute and OWL-Time DateTimeDescription qualifiers.',
        properties: {
          modUri: {
            type: 'string',
            format: 'at-uri',
            description:
              'AT-URI of the temporal modifier definition node. Community-expandable via knowledge graph.',
          },
          mod: {
            type: 'string',
            description:
              'Temporal modifier slug (fallback when modUri unavailable). Maps to TimeML TIMEX3 mod.',
            knownValues: [
              'approximate',
              'early',
              'mid',
              'late',
              'start',
              'end',
              'before',
              'after',
              'on-or-before',
              'on-or-after',
              'less-than',
              'more-than',
              'custom',
            ],
            maxLength: 64,
          },
          features: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#featureMap',
          },
        },
      },
      temporalExpression: {
        type: 'object',
        description:
          'A complete temporal annotation packaging the expression type, normalized value, modifier, anchoring, and document function. Subsumes TimeML TIMEX3 and OWL-Time GeneralDateTimeDescription. Attach to annotation objects via the temporal field.',
        properties: {
          typeUri: {
            type: 'string',
            format: 'at-uri',
            description:
              'AT-URI of the temporal expression type definition node. Community-expandable via knowledge graph.',
          },
          type: {
            type: 'string',
            description:
              'Temporal expression type slug (fallback when typeUri unavailable). Maps to TimeML TIMEX3 type.',
            knownValues: [
              'date',
              'time',
              'duration',
              'set',
              'interval',
              'relative',
              'custom',
            ],
            maxLength: 64,
          },
          value: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#temporalEntity',
            description: 'The normalized temporal value.',
          },
          modifier: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#temporalModifier',
            description:
              'Qualitative modifier (approximate, early, late, etc.).',
          },
          anchorRef: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#objectRef',
            description:
              'What this temporal expression is relative to (e.g., document creation time, another temporal expression, a situation). Maps to TimeML anchorTimeID.',
          },
          functionUri: {
            type: 'string',
            format: 'at-uri',
            description:
              'AT-URI of the document function definition node. Community-expandable via knowledge graph.',
          },
          function: {
            type: 'string',
            description:
              'Document function slug (fallback when functionUri unavailable). Maps to TimeML functionInDocument.',
            knownValues: [
              'creation-time',
              'publication-time',
              'expiration-time',
              'modification-time',
              'release-time',
              'reception-time',
              'none',
              'custom',
            ],
            maxLength: 64,
          },
          features: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#featureMap',
          },
        },
      },
      spatialEntity: {
        type: 'object',
        description:
          'A normalized spatial value representing a point, region, line, or complex geometry. Parallel to temporalEntity. Subsumes GeoJSON geometry types, WKT primitives, and ISO 19107 spatial schema. Consumers dispatch on which fields are populated: bbox only (pixel bounding box), geometry+type (parsed geometry string), geometry+geometryFormat (format-specific parsing).',
        properties: {
          bbox: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#boundingBox',
            description:
              'Structured pixel bounding box (axis-aligned rectangle). The most common case for image/video annotation.',
          },
          geometry: {
            type: 'string',
            description:
              "Geometry as a string in the format specified by geometryFormat. WKT examples: 'POINT(37.7749 -122.4194)', 'POLYGON((0 0, 100 0, 100 100, 0 100, 0 0))'. GeoJSON example: '{\"type\":\"Point\",\"coordinates\":[-122.4194,37.7749]}'. SVG path example: 'M 10 10 L 100 10 L 100 100 Z'. Default format is WKT.",
            maxLength: 65536,
          },
          typeUri: {
            type: 'string',
            format: 'at-uri',
            description:
              'AT-URI of the geometry type definition node. Community-expandable via knowledge graph.',
          },
          type: {
            type: 'string',
            description:
              'Geometry type slug (fallback when typeUri unavailable). For dispatch without parsing the geometry string.',
            knownValues: [
              'point',
              'box',
              'polygon',
              'multi-polygon',
              'line-string',
              'multi-line-string',
              'circle',
              'ellipse',
              'multi-point',
              'geometry-collection',
              'custom',
            ],
            maxLength: 64,
          },
          geometryFormatUri: {
            type: 'string',
            format: 'at-uri',
            description:
              'AT-URI of the geometry format definition node. Community-expandable via knowledge graph.',
          },
          geometryFormat: {
            type: 'string',
            description:
              'Format of the geometry string (fallback when geometryFormatUri unavailable). Default is WKT.',
            knownValues: [
              'wkt',
              'geojson',
              'svg-path',
              'coco-polygon',
              'coco-rle',
              'custom',
            ],
            maxLength: 64,
          },
          crsUri: {
            type: 'string',
            format: 'at-uri',
            description:
              'AT-URI of the coordinate reference system definition node. Community-expandable via knowledge graph.',
          },
          crs: {
            type: 'string',
            description:
              'Coordinate reference system slug (fallback when crsUri unavailable). Determines how coordinates in geometry/bbox are interpreted.',
            knownValues: [
              'pixel',
              'percentage',
              'wgs84',
              'web-mercator',
              'custom',
            ],
            maxLength: 64,
          },
          dimensions: {
            type: 'integer',
            description:
              'Number of coordinate dimensions (2 for planar, 3 for volumetric/elevation).',
            minimum: 2,
            maximum: 4,
          },
          uncertainty: {
            type: 'string',
            description:
              "Spatial precision or uncertainty radius as a string with units (e.g., '50m', '10px', '0.001deg'). Units depend on the CRS.",
            maxLength: 64,
          },
          features: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#featureMap',
          },
        },
      },
      spatialModifier: {
        type: 'object',
        description:
          'Qualitative modification of a spatial value. Parallel to temporalModifier. Indicates precision, derivation method, or processing applied to a spatial entity.',
        properties: {
          modUri: {
            type: 'string',
            format: 'at-uri',
            description:
              'AT-URI of the spatial modifier definition node. Community-expandable via knowledge graph.',
          },
          mod: {
            type: 'string',
            description:
              'Spatial modifier slug (fallback when modUri unavailable).',
            knownValues: [
              'approximate',
              'projected',
              'interpolated',
              'estimated',
              'buffered',
              'simplified',
              'generalized',
              'custom',
            ],
            maxLength: 64,
          },
          features: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#featureMap',
          },
        },
      },
      spatialExpression: {
        type: 'object',
        description:
          'A complete spatial annotation packaging the expression type, normalized value, modifier, anchoring, and document function. Parallel to temporalExpression. Subsumes ISO-Space place annotations (ISO 24617-7), SpatialML PLACE elements, and general spatial semantic annotation. Attach to annotation objects via the spatial field.',
        properties: {
          typeUri: {
            type: 'string',
            format: 'at-uri',
            description:
              'AT-URI of the spatial expression type definition node. Community-expandable via knowledge graph.',
          },
          type: {
            type: 'string',
            description:
              'Spatial expression type slug (fallback when typeUri unavailable). Maps to ISO-Space spatial entity types.',
            knownValues: [
              'location',
              'region',
              'path',
              'direction',
              'distance',
              'relative',
              'custom',
            ],
            maxLength: 64,
          },
          value: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#spatialEntity',
            description: 'The normalized spatial value.',
          },
          modifier: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#spatialModifier',
            description:
              'Qualitative modifier (approximate, projected, interpolated, etc.).',
          },
          anchorRef: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#objectRef',
            description:
              "What this spatial expression is relative to (e.g., a landmark annotation, a reference location, a trajector). For relative spatial expressions like 'behind the building'.",
          },
          functionUri: {
            type: 'string',
            format: 'at-uri',
            description:
              'AT-URI of the document function definition node. Community-expandable via knowledge graph.',
          },
          function: {
            type: 'string',
            description:
              'Document function slug (fallback when functionUri unavailable). What role this place plays in the document.',
            knownValues: [
              'document-location',
              'publication-location',
              'situation-location',
              'origin',
              'destination',
              'waypoint',
              'none',
              'custom',
            ],
            maxLength: 64,
          },
          features: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#featureMap',
          },
        },
      },
      pageAnchor: {
        type: 'object',
        description:
          "Anchor to a specific page and region in a paged document (PDF, etc.). Compatible with chive.pub's page-level annotation model.",
        required: ['page'],
        properties: {
          page: {
            type: 'integer',
            description: '0-indexed page number.',
            minimum: 0,
          },
          boundingBox: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#boundingBox',
          },
          textSpan: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#span',
            description: 'Character offsets within the page text.',
          },
        },
      },
      textQuoteSelector: {
        type: 'object',
        description:
          'W3C TextQuoteSelector: selects text by quoting it with surrounding context. Compatible with at.margin.annotation and the W3C Web Annotation Data Model.',
        required: ['exact'],
        properties: {
          exact: {
            type: 'string',
            description: 'The exact text to match.',
            maxLength: 5000,
          },
          prefix: {
            type: 'string',
            description: 'Text immediately before the selection.',
            maxLength: 500,
          },
          suffix: {
            type: 'string',
            description: 'Text immediately after the selection.',
            maxLength: 500,
          },
        },
      },
      textPositionSelector: {
        type: 'object',
        description:
          'W3C TextPositionSelector adapted for ATProto: selects by UTF-8 byte offsets. Semantically equivalent to pub.layers.defs#span but named for W3C compatibility with at.margin.',
        required: ['byteStart', 'byteEnd'],
        properties: {
          byteStart: {
            type: 'integer',
            description: 'Starting UTF-8 byte position (0-indexed, inclusive).',
            minimum: 0,
          },
          byteEnd: {
            type: 'integer',
            description: 'Ending UTF-8 byte position (exclusive).',
            minimum: 0,
          },
          charStart: {
            type: 'integer',
            description:
              'Starting character position (0-indexed, inclusive). Optional; for compatibility with character-offset datasets.',
            minimum: 0,
          },
          charEnd: {
            type: 'integer',
            description:
              'Ending character position (exclusive). Optional; for compatibility with character-offset datasets.',
            minimum: 0,
          },
        },
      },
      fragmentSelector: {
        type: 'object',
        description:
          'W3C FragmentSelector: selects by URI fragment identifier.',
        required: ['value'],
        properties: {
          value: {
            type: 'string',
            description: 'Fragment identifier value.',
            maxLength: 1000,
          },
          conformsTo: {
            type: 'string',
            format: 'uri',
            description: 'Specification the fragment conforms to.',
          },
        },
      },
      externalTarget: {
        type: 'object',
        description:
          "Target for annotating external resources (web pages, documents, etc.). Compatible with at.margin's target model and the W3C Web Annotation Data Model.",
        required: ['source'],
        properties: {
          source: {
            type: 'string',
            format: 'uri',
            description: 'The URI of the external resource being annotated.',
          },
          sourceHash: {
            type: 'string',
            description: 'SHA256 hash of normalized URI for indexing.',
            maxLength: 128,
          },
          title: {
            type: 'string',
            description: 'Title of the resource at annotation time.',
            maxLength: 500,
          },
          selector: {
            type: 'union',
            description:
              'W3C selector for identifying the specific segment within the resource.',
            refs: [
              'lex:pub.layers.defs#textQuoteSelector',
              'lex:pub.layers.defs#textPositionSelector',
              'lex:pub.layers.defs#fragmentSelector',
            ],
          },
        },
      },
      anchor: {
        type: 'object',
        description:
          'Abstract anchor: how an annotation attaches to its source data. This is a polymorphic type; at least one anchoring field should be present. Consumers dispatch on which field(s) are populated.',
        properties: {
          textSpan: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#span',
            description: 'Character-offset span in the expression text.',
          },
          tokenRef: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#tokenRef',
            description: 'Single token reference.',
          },
          tokenRefSequence: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#tokenRefSequence',
            description:
              'Sequence of token references (possibly non-contiguous).',
          },
          temporalSpan: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#temporalSpan',
            description: 'Temporal span in audio/video.',
          },
          spatioTemporalAnchor: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#spatioTemporalAnchor',
            description: 'Spatio-temporal region in video.',
          },
          pageAnchor: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#pageAnchor',
            description: 'Page and region in a paged document.',
          },
          externalTarget: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#externalTarget',
            description: 'External resource target (web page, document, etc.).',
          },
        },
      },
      alignmentLink: {
        type: 'object',
        description:
          'A single link in an alignment between two parallel sequences. Maps element(s) in a source sequence to element(s) in a target sequence. Supports many-to-many correspondence for interlinear glossing, parallel text alignment, cross-tokenization mapping, etc.',
        properties: {
          sourceIndices: {
            type: 'array',
            description: 'Indices into the source sequence.',
            items: {
              type: 'integer',
              minimum: 0,
            },
          },
          targetIndices: {
            type: 'array',
            description: 'Indices into the target sequence.',
            items: {
              type: 'integer',
              minimum: 0,
            },
          },
          confidence: {
            type: 'integer',
            description: 'Alignment confidence 0-1000.',
            minimum: 0,
            maximum: 1000,
          },
          label: {
            type: 'string',
            description:
              'Optional label for the alignment link (e.g., alignment type).',
            maxLength: 256,
          },
          knowledgeRefs: {
            type: 'array',
            description:
              'Knowledge graph references for this link (e.g., bilingual dictionary entry, translation memory source).',
            maxLength: 8,
            items: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#knowledgeRef',
            },
          },
          features: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#featureMap',
          },
        },
      },
      agentRef: {
        type: 'object',
        description:
          'A composable reference to any agent (human annotator, ML model, crowd worker, expert panel, etc.) that produced data. Separates the identity of the producer from the interpretive framework (persona) and the software used (tool). Consumers dispatch on which field(s) are populated: did for ATProto-native agents, id for anonymized or platform-specific identifiers, knowledgeRef for externally grounded agents (ORCID, HuggingFace model card, Wikidata).',
        properties: {
          did: {
            type: 'string',
            format: 'did',
            description: 'ATProto DID of the agent, if the agent has one.',
          },
          id: {
            type: 'string',
            description:
              'Arbitrary string identifier (anonymized crowdworker ID, platform username, model version string, etc.).',
            maxLength: 512,
          },
          name: {
            type: 'string',
            description: 'Human-readable display name for the agent.',
            maxLength: 512,
          },
          knowledgeRef: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#knowledgeRef',
            description:
              'External knowledge graph reference for the agent (e.g., ORCID for a human, HuggingFace model card for an ML model, Wikidata for an organization).',
          },
        },
      },
      annotationMetadata: {
        type: 'object',
        description:
          'Metadata about who or what produced an annotation, when, and with what confidence. The three key provenance fields are: agent (who did it), personaRef (under what framework), and tool (with what software).',
        required: ['tool'],
        properties: {
          agent: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#agentRef',
            description:
              'The agent (human or model) that produced this annotation. Distinct from personaRef (the interpretive framework) and tool (the software).',
          },
          tool: {
            type: 'string',
            description:
              "Name or identifier of the software tool used to produce this annotation (e.g., 'spaCy 3.7', 'brat 1.3', 'ELAN 6.4'). Distinct from agent (who ran the tool).",
            maxLength: 512,
          },
          timestamp: {
            type: 'string',
            format: 'datetime',
            description: 'When the annotation was produced.',
          },
          confidence: {
            type: 'integer',
            description:
              'Confidence score scaled 0-1000 (to avoid floats). 1000 = maximum confidence.',
            minimum: 0,
            maximum: 1000,
          },
          personaRef: {
            type: 'string',
            format: 'at-uri',
            description:
              'Reference to the persona/annotation framework under which this annotation was produced. Distinct from agent (who did it).',
          },
          dependencies: {
            type: 'array',
            description:
              'References to upstream records this annotation was derived from.',
            maxLength: 32,
            items: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#objectRef',
            },
          },
          digest: {
            type: 'string',
            description: 'Content hash for integrity verification.',
            maxLength: 128,
          },
        },
      },
      knowledgeRef: {
        type: 'object',
        description:
          'A reference to an external knowledge base entry. Supports ATProto-native KBs (e.g., chive.pub with AT-URI nodes), external KBs (e.g., Wikidata with QIDs), and user/persona-specific KBs (AT-URIs in user PDSes).',
        required: ['source', 'identifier'],
        properties: {
          sourceUri: {
            type: 'string',
            format: 'at-uri',
            description:
              'AT-URI of the knowledge base type definition node. Community-expandable via knowledge graph.',
          },
          source: {
            type: 'string',
            description:
              'Knowledge base source slug (fallback when sourceUri unavailable).',
            knownValues: [
              'chive.pub',
              'wikidata',
              'wordnet',
              'framenet',
              'propbank',
              'verbnet',
              'unimorph',
              'glottolog',
              'cldr',
              'custom',
            ],
            maxLength: 128,
          },
          identifier: {
            type: 'string',
            description:
              'The identifier within the knowledge base (e.g., Wikidata QID, chive.pub node URI, Glottolog languoid ID).',
            maxLength: 512,
          },
          uri: {
            type: 'string',
            format: 'uri',
            description: 'Optional full URI for the knowledge base entry.',
          },
          label: {
            type: 'string',
            description: 'Human-readable label for the referenced entity.',
            maxLength: 1024,
          },
        },
      },
      featureMap: {
        type: 'object',
        description:
          'An open-ended set of typed key-value features that can be attached to any annotation. Provides maximum extensibility without committing to any label set or linguistic theory.',
        required: ['entries'],
        properties: {
          entries: {
            type: 'array',
            description: 'The feature entries.',
            items: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#feature',
            },
          },
        },
      },
      feature: {
        type: 'object',
        description: 'A single key-value feature.',
        required: ['key', 'value'],
        properties: {
          key: {
            type: 'string',
            description: 'Feature name/key.',
            maxLength: 256,
          },
          value: {
            type: 'string',
            description:
              "Feature value as string. Consumers may parse typed values based on the key's semantics.",
            maxLength: 4096,
          },
        },
      },
      constraint: {
        type: 'object',
        description:
          'An abstract constraint expression. Used for type constraints on role slots, slot-level constraints in templates, cross-slot agreement constraints, and any other declarative restriction. The expression field holds a DSL string whose format is identified by expressionFormat/expressionFormatUri.',
        required: ['expression'],
        properties: {
          expression: {
            type: 'string',
            description:
              "The constraint expression (e.g., 'self.pos == \"VERB\"', 'subject.features.number == verb.features.number').",
            maxLength: 4096,
          },
          expressionFormatUri: {
            type: 'string',
            format: 'at-uri',
            description:
              'AT-URI of the expression format definition node. Community-expandable via knowledge graph.',
          },
          expressionFormat: {
            type: 'string',
            description:
              'Expression format slug (fallback when expressionFormatUri unavailable).',
            knownValues: [
              'python-expr',
              'json-logic',
              'regex',
              'sparql-filter',
              'type-ref',
              'custom',
            ],
            maxLength: 128,
          },
          scopeUri: {
            type: 'string',
            format: 'at-uri',
            description:
              'AT-URI of the scope definition node. Community-expandable via knowledge graph.',
          },
          scope: {
            type: 'string',
            description:
              'Constraint scope slug (fallback when scopeUri unavailable).',
            knownValues: ['slot', 'template', 'cross-template', 'global'],
            maxLength: 128,
          },
          context: {
            type: 'array',
            description:
              'Names of the slots or variables this constraint ranges over (for cross-slot and cross-template constraints).',
            maxLength: 32,
            items: {
              type: 'string',
              maxLength: 256,
            },
          },
          description: {
            type: 'string',
            description: 'Human-readable description of the constraint.',
            maxLength: 2048,
          },
        },
      },
      objectRef: {
        type: 'object',
        description:
          'A composable reference to any Layers object, whether local (same record, by UUID), remote (different record, by AT-URI + optional object UUID), or external (knowledge graph entry). This is the universal cross-referencing primitive; consumers dispatch on which field(s) are populated. Used by argumentRef, graphNode, alignment endpoints, and any other cross-object pointer.',
        properties: {
          localId: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#uuid',
            description: 'UUID of an object within the same record.',
          },
          recordRef: {
            type: 'string',
            format: 'at-uri',
            description:
              "AT-URI of a Layers record in another user's PDS or another record in the same PDS.",
          },
          objectId: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#uuid',
            description:
              'UUID of a specific object within the record referenced by recordRef.',
          },
          knowledgeRef: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#knowledgeRef',
            description:
              'Reference to an external knowledge graph node (Wikidata, chive.pub, FrameNet, etc.).',
          },
        },
      },
    },
  },
  PubLayersEprintDataLink: {
    lexicon: 1,
    id: 'pub.layers.eprint.dataLink',
    defs: {
      main: {
        type: 'record',
        description:
          'A link from an eprint to the Layers data it produced or is associated with. Generalizes the former chive-specific eprintDataLink.',
        key: 'tid',
        record: {
          type: 'object',
          required: ['eprintUri', 'dataKind', 'createdAt'],
          properties: {
            eprintUri: {
              type: 'string',
              format: 'at-uri',
              description: 'AT-URI of the eprint on its publication platform.',
            },
            eprintDid: {
              type: 'string',
              format: 'did',
              description:
                'DID of the eprint author/owner on the publication platform.',
            },
            dataKindUri: {
              type: 'string',
              format: 'at-uri',
              description:
                'AT-URI of the data kind definition node. Community-expandable via knowledge graph.',
            },
            dataKind: {
              type: 'string',
              description:
                'Data kind slug (fallback when dataKindUri unavailable).',
              knownValues: [
                'corpus',
                'annotation-layer',
                'model-output',
                'gold-standard',
                'evaluation-data',
                'supplementary',
                'replication',
              ],
              maxLength: 128,
            },
            corpusRef: {
              type: 'string',
              format: 'at-uri',
              description: 'Reference to a Layers corpus.',
            },
            expressionRefs: {
              type: 'array',
              description: 'References to specific Layers expressions.',
              maxLength: 10000,
              items: {
                type: 'string',
                format: 'at-uri',
              },
            },
            annotationRefs: {
              type: 'array',
              description: 'References to specific annotation records.',
              maxLength: 10000,
              items: {
                type: 'string',
                format: 'at-uri',
              },
            },
            description: {
              type: 'string',
              maxLength: 10000,
            },
            paperSection: {
              type: 'string',
              description:
                "Which section of the paper this data corresponds to (e.g., 'Section 4.2', 'Table 3', 'Appendix A').",
              maxLength: 256,
            },
            reproducibility: {
              type: 'ref',
              ref: 'lex:pub.layers.eprint.defs#reproducibilityInfo',
            },
            features: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#featureMap',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
          },
        },
      },
    },
  },
  PubLayersEprintDefs: {
    lexicon: 1,
    id: 'pub.layers.eprint.defs',
    defs: {
      reproducibilityInfo: {
        type: 'object',
        description:
          'Information about how to reproduce the data from the eprint.',
        properties: {
          codeUri: {
            type: 'string',
            format: 'uri',
            description: 'URI of the code repository.',
            maxLength: 2048,
          },
          commitHash: {
            type: 'string',
            description: 'Git commit hash for reproducibility.',
            maxLength: 64,
          },
          command: {
            type: 'string',
            description: 'Command to reproduce the data.',
            maxLength: 4096,
          },
          environment: {
            type: 'string',
            description:
              'Environment specification (Docker image, conda env, etc.).',
            maxLength: 2048,
          },
          randomSeed: {
            type: 'integer',
            description: 'Random seed used.',
          },
        },
      },
    },
  },
  PubLayersEprintEprint: {
    lexicon: 1,
    id: 'pub.layers.eprint.eprint',
    defs: {
      main: {
        type: 'record',
        description: 'A link between a Layers data record and an eprint.',
        key: 'tid',
        record: {
          type: 'object',
          required: ['eprintIdentifier', 'linkType', 'createdAt'],
          properties: {
            eprintIdentifier: {
              type: 'string',
              description:
                'The eprint identifier (DOI, arXiv ID, ACL Anthology ID, etc.).',
              maxLength: 512,
            },
            eprintIdentifierTypeUri: {
              type: 'string',
              format: 'at-uri',
              description:
                'AT-URI of the identifier type definition node. Community-expandable via knowledge graph.',
            },
            eprintIdentifierType: {
              type: 'string',
              description:
                'Identifier type slug (fallback when eprintIdentifierTypeUri unavailable).',
              knownValues: [
                'doi',
                'arxiv',
                'acl-anthology',
                'semantic-scholar',
                'pubmed',
                'isbn',
                'url',
                'at-uri',
                'custom',
              ],
              maxLength: 128,
            },
            eprintUri: {
              type: 'string',
              format: 'uri',
              description: 'Full URI of the eprint.',
            },
            platformEprintRef: {
              type: 'string',
              format: 'at-uri',
              description:
                'AT-URI of the eprint record on its publication platform (e.g., chive.pub, any ATProto-native publication service).',
            },
            linkTypeUri: {
              type: 'string',
              format: 'at-uri',
              description:
                'AT-URI of the link type definition node. Community-expandable via knowledge graph.',
            },
            linkType: {
              type: 'string',
              description:
                'Link type slug (fallback when linkTypeUri unavailable).',
              knownValues: [
                'produced-by',
                'described-in',
                'evaluated-in',
                'replicated-from',
                'extends',
                'supplements',
                'cited-in',
                'annotates',
                'training-data-for',
                'test-data-for',
              ],
              maxLength: 128,
            },
            expressionRefs: {
              type: 'array',
              description:
                'References to Layers expressions linked to this eprint.',
              maxLength: 1000,
              items: {
                type: 'string',
                format: 'at-uri',
              },
            },
            annotationRefs: {
              type: 'array',
              description:
                'References to specific annotation records linked to this eprint.',
              maxLength: 1000,
              items: {
                type: 'string',
                format: 'at-uri',
              },
            },
            corpusRef: {
              type: 'string',
              format: 'at-uri',
              description: 'Reference to a corpus record.',
            },
            description: {
              type: 'string',
              description: 'Description of the relationship.',
              maxLength: 10000,
            },
            citation: {
              type: 'string',
              description: 'Full citation string.',
              maxLength: 4096,
            },
            knowledgeRefs: {
              type: 'array',
              description:
                'Knowledge graph references (e.g., Wikidata for the venue, DBLP, Semantic Scholar corpus ID).',
              maxLength: 32,
              items: {
                type: 'ref',
                ref: 'lex:pub.layers.defs#knowledgeRef',
              },
            },
            features: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#featureMap',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
          },
        },
      },
    },
  },
  PubLayersEprintGetDataLink: {
    lexicon: 1,
    id: 'pub.layers.eprint.getDataLink',
    defs: {
      main: {
        type: 'query',
        description: 'Get a single data link by its AT-URI.',
        parameters: {
          type: 'params',
          required: ['uri'],
          properties: {
            uri: {
              type: 'string',
              format: 'at-uri',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['uri', 'cid', 'value'],
            properties: {
              uri: {
                type: 'string',
                format: 'at-uri',
              },
              cid: {
                type: 'string',
                format: 'cid',
              },
              value: {
                type: 'ref',
                ref: 'lex:pub.layers.eprint.dataLink#main',
              },
            },
          },
        },
        errors: [
          {
            name: 'RecordNotFound',
          },
        ],
      },
    },
  },
  PubLayersEprintGetEprint: {
    lexicon: 1,
    id: 'pub.layers.eprint.getEprint',
    defs: {
      main: {
        type: 'query',
        description: 'Get a single eprint by its AT-URI.',
        parameters: {
          type: 'params',
          required: ['uri'],
          properties: {
            uri: {
              type: 'string',
              format: 'at-uri',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['uri', 'cid', 'value'],
            properties: {
              uri: {
                type: 'string',
                format: 'at-uri',
              },
              cid: {
                type: 'string',
                format: 'cid',
              },
              value: {
                type: 'ref',
                ref: 'lex:pub.layers.eprint.eprint#main',
              },
            },
          },
        },
        errors: [
          {
            name: 'RecordNotFound',
          },
        ],
      },
    },
  },
  PubLayersEprintListDataLinks: {
    lexicon: 1,
    id: 'pub.layers.eprint.listDataLinks',
    defs: {
      main: {
        type: 'query',
        description: 'List data links.',
        parameters: {
          type: 'params',
          required: ['eprintUri'],
          properties: {
            eprintUri: {
              type: 'string',
              format: 'at-uri',
            },
            dataKind: {
              type: 'string',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
            },
            cursor: {
              type: 'string',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['records'],
            properties: {
              cursor: {
                type: 'string',
              },
              records: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:pub.layers.eprint.listDataLinks#recordView',
                },
              },
            },
          },
        },
      },
      recordView: {
        type: 'object',
        required: ['uri', 'cid', 'value'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          cid: {
            type: 'string',
            format: 'cid',
          },
          value: {
            type: 'ref',
            ref: 'lex:pub.layers.eprint.dataLink#main',
          },
        },
      },
    },
  },
  PubLayersEprintListEprints: {
    lexicon: 1,
    id: 'pub.layers.eprint.listEprints',
    defs: {
      main: {
        type: 'query',
        description: 'List eprints.',
        parameters: {
          type: 'params',
          required: ['repo'],
          properties: {
            repo: {
              type: 'string',
              format: 'at-identifier',
            },
            linkType: {
              type: 'string',
            },
            eprintIdentifierType: {
              type: 'string',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
            },
            cursor: {
              type: 'string',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['records'],
            properties: {
              cursor: {
                type: 'string',
              },
              records: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:pub.layers.eprint.listEprints#recordView',
                },
              },
            },
          },
        },
      },
      recordView: {
        type: 'object',
        required: ['uri', 'cid', 'value'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          cid: {
            type: 'string',
            format: 'cid',
          },
          value: {
            type: 'ref',
            ref: 'lex:pub.layers.eprint.eprint#main',
          },
        },
      },
    },
  },
  PubLayersExpressionExpression: {
    lexicon: 1,
    id: 'pub.layers.expression.expression',
    description:
      "An Expression is the primary document model in Layers. It represents any linguistic unit (a document, transcript, recording, paragraph, sentence, word, morpheme) with recursive nesting via parent references. Inspired by Concrete's Communication, generalized to support recursive sub-expression structure.",
    defs: {
      main: {
        type: 'record',
        description:
          'An expression record representing a linguistic data source or unit at any granularity, from full documents down to individual morphemes.',
        key: 'tid',
        record: {
          type: 'object',
          required: ['id', 'kind', 'createdAt'],
          properties: {
            id: {
              type: 'string',
              description:
                'A corpus-level unique identifier (headline, URL, document ID, etc.).',
              maxLength: 1024,
            },
            kindUri: {
              type: 'string',
              format: 'at-uri',
              description:
                'AT-URI of the expression kind definition node. Community-expandable via knowledge graph.',
            },
            kind: {
              type: 'string',
              description:
                'Expression kind slug (fallback when kindUri unavailable).',
              knownValues: [
                'document',
                'transcript',
                'dialogue',
                'social-media',
                'email',
                'article',
                'recording',
                'video',
                'multimodal',
                'code',
                'section',
                'paragraph',
                'chapter',
                'turn',
                'utterance',
                'heading',
                'list',
                'sentence',
                'clause',
                'phrase',
                'word',
                'morpheme',
                'character',
                'other',
              ],
              maxLength: 128,
            },
            text: {
              type: 'string',
              description:
                'The full raw text of the expression. All byte-offset spans reference this string.',
              maxLength: 10000000,
            },
            parentRef: {
              type: 'string',
              format: 'at-uri',
              description:
                'Reference to the parent Expression this one is nested within. Absent for top-level expressions (documents, recordings, etc.).',
            },
            anchor: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#anchor',
              description:
                'How this expression attaches to its parent (character span, temporal span, etc.).',
            },
            mediaRef: {
              type: 'string',
              format: 'at-uri',
              description:
                'Reference to an associated media record (audio, video, image).',
            },
            mediaBlob: {
              type: 'blob',
              description: 'Optional inline media blob.',
              accept: ['audio/*', 'video/*', 'image/*'],
              maxSize: 52428800,
            },
            language: {
              type: 'string',
              description: 'BCP-47 language tag for the primary language.',
              maxLength: 32,
            },
            languages: {
              type: 'array',
              description:
                'Additional BCP-47 tags for multilingual or code-switching expressions.',
              maxLength: 64,
              items: {
                type: 'string',
                maxLength: 32,
              },
            },
            metadata: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#annotationMetadata',
            },
            features: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#featureMap',
              description: 'Arbitrary document-level features and metadata.',
            },
            sourceUrl: {
              type: 'string',
              format: 'uri',
              description:
                'URL of the external web resource this expression was derived from or annotates. The appview indexes this field to discover co-located annotations from other ATProto apps.',
              maxLength: 4096,
            },
            sourceRef: {
              type: 'string',
              format: 'at-uri',
              description:
                'AT-URI of an external ATProto record this expression is derived from or annotates (e.g., a standard.site Leaflet post, a com.whtwnd blog entry, an app.bsky.feed.post, an at.margin.bookmark).',
            },
            eprintRef: {
              type: 'string',
              format: 'at-uri',
              description:
                'Reference to an eprint record that this expression is associated with.',
            },
            knowledgeRefs: {
              type: 'array',
              description:
                'References to knowledge base entries relevant to this expression.',
              maxLength: 128,
              items: {
                type: 'ref',
                ref: 'lex:pub.layers.defs#knowledgeRef',
              },
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
          },
        },
      },
    },
  },
  PubLayersExpressionGetExpression: {
    lexicon: 1,
    id: 'pub.layers.expression.getExpression',
    defs: {
      main: {
        type: 'query',
        description: 'Get a single expression by its AT-URI.',
        parameters: {
          type: 'params',
          required: ['uri'],
          properties: {
            uri: {
              type: 'string',
              format: 'at-uri',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['uri', 'cid', 'value'],
            properties: {
              uri: {
                type: 'string',
                format: 'at-uri',
              },
              cid: {
                type: 'string',
                format: 'cid',
              },
              value: {
                type: 'ref',
                ref: 'lex:pub.layers.expression.expression#main',
              },
            },
          },
        },
        errors: [
          {
            name: 'RecordNotFound',
          },
        ],
      },
    },
  },
  PubLayersExpressionListExpressions: {
    lexicon: 1,
    id: 'pub.layers.expression.listExpressions',
    defs: {
      main: {
        type: 'query',
        description: 'List expressions in a repository.',
        parameters: {
          type: 'params',
          required: ['repo'],
          properties: {
            repo: {
              type: 'string',
              format: 'at-identifier',
            },
            language: {
              type: 'string',
              maxLength: 32,
            },
            kind: {
              type: 'string',
              maxLength: 128,
            },
            parentRef: {
              type: 'string',
              format: 'at-uri',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
            },
            cursor: {
              type: 'string',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['records'],
            properties: {
              cursor: {
                type: 'string',
              },
              records: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:pub.layers.expression.listExpressions#recordView',
                },
              },
            },
          },
        },
      },
      recordView: {
        type: 'object',
        required: ['uri', 'cid', 'value'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          cid: {
            type: 'string',
            format: 'cid',
          },
          value: {
            type: 'ref',
            ref: 'lex:pub.layers.expression.expression#main',
          },
        },
      },
    },
  },
  PubLayersGraphDefs: {
    lexicon: 1,
    id: 'pub.layers.graph.defs',
    description: 'Shared object definitions for the graph namespace.',
    defs: {
      graphEdgeEntry: {
        type: 'object',
        description: 'A single directed edge entry within a graphEdgeSet.',
        required: ['uuid', 'source', 'target', 'edgeType'],
        properties: {
          uuid: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#uuid',
          },
          edgeTypeUri: {
            type: 'string',
            format: 'at-uri',
            description:
              'AT-URI of the edge type definition node. Overrides the set-level edgeType.',
          },
          edgeType: {
            type: 'string',
            description:
              'Edge type slug. Overrides the set-level edgeType if different.',
            maxLength: 256,
          },
          source: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#objectRef',
            description: 'Source node.',
          },
          target: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#objectRef',
            description: 'Target node.',
          },
          confidence: {
            type: 'integer',
            minimum: 0,
            maximum: 1000,
          },
          features: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#featureMap',
          },
        },
      },
    },
  },
  PubLayersGraphGetGraphEdge: {
    lexicon: 1,
    id: 'pub.layers.graph.getGraphEdge',
    defs: {
      main: {
        type: 'query',
        description: 'Get a single graph edge by its AT-URI.',
        parameters: {
          type: 'params',
          required: ['uri'],
          properties: {
            uri: {
              type: 'string',
              format: 'at-uri',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['uri', 'cid', 'value'],
            properties: {
              uri: {
                type: 'string',
                format: 'at-uri',
              },
              cid: {
                type: 'string',
                format: 'cid',
              },
              value: {
                type: 'ref',
                ref: 'lex:pub.layers.graph.graphEdge#main',
              },
            },
          },
        },
        errors: [
          {
            name: 'RecordNotFound',
          },
        ],
      },
    },
  },
  PubLayersGraphGetGraphEdgeSet: {
    lexicon: 1,
    id: 'pub.layers.graph.getGraphEdgeSet',
    defs: {
      main: {
        type: 'query',
        description: 'Get a single graph edge set by its AT-URI.',
        parameters: {
          type: 'params',
          required: ['uri'],
          properties: {
            uri: {
              type: 'string',
              format: 'at-uri',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['uri', 'cid', 'value'],
            properties: {
              uri: {
                type: 'string',
                format: 'at-uri',
              },
              cid: {
                type: 'string',
                format: 'cid',
              },
              value: {
                type: 'ref',
                ref: 'lex:pub.layers.graph.graphEdgeSet#main',
              },
            },
          },
        },
        errors: [
          {
            name: 'RecordNotFound',
          },
        ],
      },
    },
  },
  PubLayersGraphGetGraphNode: {
    lexicon: 1,
    id: 'pub.layers.graph.getGraphNode',
    defs: {
      main: {
        type: 'query',
        description: 'Get a single graph node by its AT-URI.',
        parameters: {
          type: 'params',
          required: ['uri'],
          properties: {
            uri: {
              type: 'string',
              format: 'at-uri',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['uri', 'cid', 'value'],
            properties: {
              uri: {
                type: 'string',
                format: 'at-uri',
              },
              cid: {
                type: 'string',
                format: 'cid',
              },
              value: {
                type: 'ref',
                ref: 'lex:pub.layers.graph.graphNode#main',
              },
            },
          },
        },
        errors: [
          {
            name: 'RecordNotFound',
          },
        ],
      },
    },
  },
  PubLayersGraphGraphEdge: {
    lexicon: 1,
    id: 'pub.layers.graph.graphEdge',
    defs: {
      main: {
        type: 'record',
        description:
          'A single directed typed edge between any two Layers objects. Supports multidigraphs and cycles. Source and target use objectRef, which can point to local UUIDs, remote AT-URIs, or external knowledge graph nodes.',
        key: 'tid',
        record: {
          type: 'object',
          required: ['source', 'target', 'edgeType', 'createdAt'],
          properties: {
            source: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#objectRef',
              description:
                'Source node: use localId for same-record UUID, recordRef for cross-record AT-URI, knowledgeRef for external KG.',
            },
            target: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#objectRef',
              description:
                'Target node: use localId for same-record UUID, recordRef for cross-record AT-URI, knowledgeRef for external KG.',
            },
            edgeTypeUri: {
              type: 'string',
              format: 'at-uri',
              description:
                'AT-URI of the edge type definition node. Community-expandable via knowledge graph.',
            },
            edgeType: {
              type: 'string',
              description:
                'Edge type slug (fallback when edgeTypeUri unavailable).',
              knownValues: [
                'reply-to',
                'quote',
                'repost',
                'translation-of',
                'continuation',
                'summary-of',
                'revision-of',
                'correction-of',
                'coreference',
                'causal',
                'part-of',
                'member-of',
                'type-of',
                'same-as',
                'related-to',
                'derived-from',
                'supports',
                'contradicts',
                'discourse',
                'bridging',
                'grounding',
                'instance-of',
                'denotes',
                'describes',
                'specializes',
                'elaborates',
                'produced-by',
                'described-in',
                'annotates',
                'see-also',
                'before',
                'after',
                'meets',
                'met-by',
                'overlaps',
                'overlapped-by',
                'starts',
                'started-by',
                'during',
                'contains',
                'finishes',
                'finished-by',
                'equals',
                'simultaneous',
                'initiates',
                'culminates',
                'terminates',
                'continues',
                'reinitiates',
                'disconnected',
                'externally-connected',
                'partially-overlapping',
                'tangential-proper-part',
                'non-tangential-proper-part',
                'tangential-proper-part-inverse',
                'non-tangential-proper-part-inverse',
                'spatially-equal',
                'north-of',
                'south-of',
                'east-of',
                'west-of',
                'above',
                'below',
                'in-front-of',
                'behind',
                'left-of',
                'right-of',
                'near',
                'far',
                'adjacent',
                'custom',
              ],
              maxLength: 128,
            },
            label: {
              type: 'string',
              description: 'Optional edge label.',
              maxLength: 512,
            },
            ordinal: {
              type: 'integer',
              description: 'Optional ordering among edges of the same type.',
              minimum: 0,
            },
            confidence: {
              type: 'integer',
              description: 'Confidence 0-1000.',
              minimum: 0,
              maximum: 1000,
            },
            properties: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#featureMap',
              description: 'Edge properties as key-value pairs.',
            },
            metadata: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#annotationMetadata',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
          },
        },
      },
    },
  },
  PubLayersGraphGraphEdgeSet: {
    lexicon: 1,
    id: 'pub.layers.graph.graphEdgeSet',
    defs: {
      main: {
        type: 'record',
        description:
          'A batch of typed, directed edges between Layers objects. Use for bulk edge creation when many edges share the same provenance and context.',
        key: 'tid',
        record: {
          type: 'object',
          required: ['edges', 'createdAt'],
          properties: {
            expression: {
              type: 'string',
              format: 'at-uri',
              description: 'Optional primary expression context.',
            },
            edgeTypeUri: {
              type: 'string',
              format: 'at-uri',
              description:
                'AT-URI of the edge type definition node. Community-expandable via knowledge graph.',
            },
            edgeType: {
              type: 'string',
              description:
                'Edge type slug shared by all edges in this set (fallback when edgeTypeUri unavailable).',
              knownValues: [
                'coreference',
                'causal',
                'part-of',
                'member-of',
                'type-of',
                'same-as',
                'related-to',
                'derived-from',
                'supports',
                'contradicts',
                'discourse',
                'bridging',
                'before',
                'after',
                'meets',
                'met-by',
                'overlaps',
                'overlapped-by',
                'starts',
                'started-by',
                'during',
                'contains',
                'finishes',
                'finished-by',
                'equals',
                'simultaneous',
                'initiates',
                'culminates',
                'terminates',
                'continues',
                'reinitiates',
                'disconnected',
                'externally-connected',
                'partially-overlapping',
                'tangential-proper-part',
                'non-tangential-proper-part',
                'tangential-proper-part-inverse',
                'non-tangential-proper-part-inverse',
                'spatially-equal',
                'north-of',
                'south-of',
                'east-of',
                'west-of',
                'above',
                'below',
                'in-front-of',
                'behind',
                'left-of',
                'right-of',
                'near',
                'far',
                'adjacent',
                'custom',
              ],
              maxLength: 128,
            },
            edges: {
              type: 'array',
              items: {
                type: 'ref',
                ref: 'lex:pub.layers.graph.defs#graphEdgeEntry',
              },
            },
            metadata: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#annotationMetadata',
            },
            knowledgeRefs: {
              type: 'array',
              description:
                'Knowledge graph references for this edge set (e.g., the relation ontology it implements, source methodology).',
              maxLength: 32,
              items: {
                type: 'ref',
                ref: 'lex:pub.layers.defs#knowledgeRef',
              },
            },
            features: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#featureMap',
              description:
                'Open-ended features (e.g., extraction method, model version, confidence threshold).',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
          },
        },
      },
    },
  },
  PubLayersGraphGraphNode: {
    lexicon: 1,
    id: 'pub.layers.graph.graphNode',
    defs: {
      main: {
        type: 'record',
        description:
          'A standalone node in the property graph. Represents entities, concepts, situations, claims, or any domain object that does not have another Layers record. Existing Layers records (expressions, annotations, typeDefs) are implicitly nodes via objectRef.',
        key: 'tid',
        record: {
          type: 'object',
          required: ['nodeType', 'createdAt'],
          properties: {
            nodeTypeUri: {
              type: 'string',
              format: 'at-uri',
              description:
                'AT-URI of the node type definition node. Community-expandable via knowledge graph.',
            },
            nodeType: {
              type: 'string',
              description:
                'Node type slug (fallback when nodeTypeUri unavailable).',
              knownValues: [
                'entity',
                'concept',
                'situation',
                'state',
                'time',
                'location',
                'claim',
                'proposition',
                'custom',
              ],
              maxLength: 128,
            },
            label: {
              type: 'string',
              description: 'Human-readable node label.',
              maxLength: 1024,
            },
            properties: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#featureMap',
              description: 'Node properties as key-value pairs.',
            },
            knowledgeRefs: {
              type: 'array',
              description:
                'Knowledge graph references grounding this node (Wikidata, chive.pub, FrameNet, etc.).',
              maxLength: 64,
              items: {
                type: 'ref',
                ref: 'lex:pub.layers.defs#knowledgeRef',
              },
            },
            metadata: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#annotationMetadata',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
          },
        },
      },
    },
  },
  PubLayersGraphListGraphEdgeSets: {
    lexicon: 1,
    id: 'pub.layers.graph.listGraphEdgeSets',
    defs: {
      main: {
        type: 'query',
        description: 'List graph edge sets.',
        parameters: {
          type: 'params',
          required: ['repo'],
          properties: {
            repo: {
              type: 'string',
              format: 'at-identifier',
            },
            edgeType: {
              type: 'string',
            },
            expression: {
              type: 'string',
              format: 'at-uri',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
            },
            cursor: {
              type: 'string',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['records'],
            properties: {
              cursor: {
                type: 'string',
              },
              records: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:pub.layers.graph.listGraphEdgeSets#recordView',
                },
              },
            },
          },
        },
      },
      recordView: {
        type: 'object',
        required: ['uri', 'cid', 'value'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          cid: {
            type: 'string',
            format: 'cid',
          },
          value: {
            type: 'ref',
            ref: 'lex:pub.layers.graph.graphEdgeSet#main',
          },
        },
      },
    },
  },
  PubLayersGraphListGraphEdges: {
    lexicon: 1,
    id: 'pub.layers.graph.listGraphEdges',
    defs: {
      main: {
        type: 'query',
        description: 'List graph edges.',
        parameters: {
          type: 'params',
          required: ['repo'],
          properties: {
            repo: {
              type: 'string',
              format: 'at-identifier',
            },
            edgeType: {
              type: 'string',
            },
            source: {
              type: 'string',
              format: 'at-uri',
            },
            target: {
              type: 'string',
              format: 'at-uri',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
            },
            cursor: {
              type: 'string',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['records'],
            properties: {
              cursor: {
                type: 'string',
              },
              records: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:pub.layers.graph.listGraphEdges#recordView',
                },
              },
            },
          },
        },
      },
      recordView: {
        type: 'object',
        required: ['uri', 'cid', 'value'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          cid: {
            type: 'string',
            format: 'cid',
          },
          value: {
            type: 'ref',
            ref: 'lex:pub.layers.graph.graphEdge#main',
          },
        },
      },
    },
  },
  PubLayersGraphListGraphNodes: {
    lexicon: 1,
    id: 'pub.layers.graph.listGraphNodes',
    defs: {
      main: {
        type: 'query',
        description: 'List graph nodes.',
        parameters: {
          type: 'params',
          required: ['repo'],
          properties: {
            repo: {
              type: 'string',
              format: 'at-identifier',
            },
            nodeType: {
              type: 'string',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
            },
            cursor: {
              type: 'string',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['records'],
            properties: {
              cursor: {
                type: 'string',
              },
              records: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:pub.layers.graph.listGraphNodes#recordView',
                },
              },
            },
          },
        },
      },
      recordView: {
        type: 'object',
        required: ['uri', 'cid', 'value'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          cid: {
            type: 'string',
            format: 'cid',
          },
          value: {
            type: 'ref',
            ref: 'lex:pub.layers.graph.graphNode#main',
          },
        },
      },
    },
  },
  PubLayersJudgmentAgreementReport: {
    lexicon: 1,
    id: 'pub.layers.judgment.agreementReport',
    defs: {
      main: {
        type: 'record',
        description:
          'An inter-annotator agreement report summarizing agreement metrics across judgment sets.',
        key: 'tid',
        record: {
          type: 'object',
          required: ['experimentRef', 'createdAt'],
          properties: {
            experimentRef: {
              type: 'string',
              format: 'at-uri',
            },
            judgmentSetRefs: {
              type: 'array',
              description: 'The judgment sets compared.',
              items: {
                type: 'string',
                format: 'at-uri',
              },
            },
            metricUri: {
              type: 'string',
              format: 'at-uri',
              description:
                'AT-URI of the metric definition node. Community-expandable via knowledge graph.',
            },
            metric: {
              type: 'string',
              description: 'Metric slug (fallback when metricUri unavailable).',
              knownValues: [
                'cohens-kappa',
                'fleiss-kappa',
                'krippendorff-alpha',
                'percent-agreement',
                'correlation',
                'f1',
                'custom',
              ],
              maxLength: 128,
            },
            value: {
              type: 'integer',
              description: 'Metric value scaled 0-1000.',
              minimum: 0,
              maximum: 1000,
            },
            numAnnotators: {
              type: 'integer',
              minimum: 1,
            },
            numItems: {
              type: 'integer',
              minimum: 1,
            },
            features: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#featureMap',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
          },
        },
      },
    },
  },
  PubLayersJudgmentDefs: {
    lexicon: 1,
    id: 'pub.layers.judgment.defs',
    description: 'Shared object definitions for the judgment namespace.',
    defs: {
      judgment: {
        type: 'object',
        description: 'A single judgment about a linguistic item.',
        required: ['item'],
        properties: {
          item: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#objectRef',
            description:
              'Reference to the item being judged. Use recordRef for the communication/annotation record, objectId for a specific object within it, localId for same-record references.',
          },
          fillingRef: {
            type: 'string',
            format: 'at-uri',
            description:
              'Reference to the pub.layers.resource#filling that generated the item being judged.',
          },
          categoricalValue: {
            type: 'string',
            description: 'Categorical judgment label.',
            maxLength: 512,
          },
          scalarValue: {
            type: 'integer',
            description:
              'Numeric response value (ordinal-scale rating, magnitude estimate, or rank position).',
          },
          textSpan: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#span',
            description: 'Selected text span for span-labeling tasks.',
          },
          freeText: {
            type: 'string',
            description: 'Free-text response.',
            maxLength: 10000,
          },
          responseTimeMs: {
            type: 'integer',
            description: 'Response time in milliseconds.',
            minimum: 0,
          },
          confidence: {
            type: 'integer',
            minimum: 0,
            maximum: 1000,
          },
          behavioralData: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#featureMap',
            description:
              'Behavioral signals: mouse movements, keystroke patterns, eye tracking data, scroll events, etc.',
          },
          features: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#featureMap',
          },
        },
      },
      experimentDesign: {
        type: 'object',
        description:
          'Experiment design parameters for item distribution, ordering, and timing.',
        properties: {
          listConstraints: {
            type: 'array',
            description:
              'Constraints on item list construction (Latin square balancing, no-adjacent-same-condition, etc.).',
            maxLength: 32,
            items: {
              type: 'ref',
              ref: 'lex:pub.layers.judgment.defs#listConstraint',
            },
          },
          distributionStrategyUri: {
            type: 'string',
            format: 'at-uri',
            description:
              'AT-URI of the distribution strategy definition node. Community-expandable.',
          },
          distributionStrategy: {
            type: 'string',
            description: 'How items are distributed to annotators.',
            knownValues: [
              'latin-square',
              'random',
              'blocked',
              'stratified',
              'custom',
            ],
            maxLength: 128,
          },
          itemOrderUri: {
            type: 'string',
            format: 'at-uri',
            description:
              'AT-URI of the item order definition node. Community-expandable.',
          },
          itemOrder: {
            type: 'string',
            description: 'How items are ordered within a list.',
            knownValues: [
              'random-order',
              'fixed-order',
              'blocked',
              'adaptive',
              'custom',
            ],
            maxLength: 128,
          },
          timingMs: {
            type: 'integer',
            description: 'Target timing per item in milliseconds.',
            minimum: 0,
          },
          features: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#featureMap',
          },
        },
      },
      listConstraint: {
        type: 'object',
        description:
          'A constraint on item list construction for an experiment.',
        required: ['kind'],
        properties: {
          kindUri: {
            type: 'string',
            format: 'at-uri',
            description:
              'AT-URI of the constraint kind definition node. Community-expandable.',
          },
          kind: {
            type: 'string',
            description: 'Constraint kind slug.',
            knownValues: [
              'latin-square',
              'no-adjacent-same-condition',
              'balanced-frequency',
              'minimum-distance',
              'custom',
            ],
            maxLength: 128,
          },
          targetProperty: {
            type: 'string',
            description:
              "The item property this constraint operates on (e.g., 'condition', 'templateRef').",
            maxLength: 256,
          },
          parameters: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#featureMap',
            description:
              'Constraint parameters (e.g., minimum distance, number of lists).',
          },
          constraint: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#constraint',
            description: 'Optional formal constraint expression.',
          },
        },
      },
      presentationSpec: {
        type: 'object',
        description: 'How stimuli are displayed to participants.',
        properties: {
          methodUri: {
            type: 'string',
            format: 'at-uri',
            description:
              'AT-URI of the presentation method definition node. Community-expandable via knowledge graph.',
          },
          method: {
            type: 'string',
            description:
              'Presentation method (fallback when methodUri unavailable).',
            knownValues: [
              'rsvp',
              'self-paced',
              'whole-sentence',
              'auditory',
              'visual-world',
              'masked-priming',
              'cross-modal',
              'naturalistic',
              'gating',
              'maze',
              'boundary',
              'moving-window',
              'custom',
            ],
            maxLength: 128,
          },
          chunkingUnit: {
            type: 'string',
            description: 'How text is segmented for incremental presentation.',
            knownValues: [
              'word',
              'character',
              'morpheme',
              'phrase',
              'sentence',
              'region',
              'custom',
            ],
            maxLength: 128,
          },
          timingMs: {
            type: 'integer',
            description: 'Per-chunk display duration in milliseconds.',
            minimum: 0,
          },
          isiMs: {
            type: 'integer',
            description: 'Inter-stimulus interval in milliseconds.',
            minimum: 0,
          },
          cumulative: {
            type: 'boolean',
            description:
              'Whether previous chunks remain visible during incremental presentation.',
          },
          maskChar: {
            type: 'string',
            description:
              "Masking character for non-cumulative displays (e.g., '-', '#').",
            maxLength: 8,
          },
          features: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#featureMap',
          },
        },
      },
      recordingMethod: {
        type: 'object',
        description: 'A data capture instrument used in an experiment.',
        required: ['method'],
        properties: {
          methodUri: {
            type: 'string',
            format: 'at-uri',
            description:
              'AT-URI of the recording method definition node. Community-expandable via knowledge graph.',
          },
          method: {
            type: 'string',
            description:
              'Recording method (fallback when methodUri unavailable).',
            knownValues: [
              'button-box',
              'keyboard',
              'mouse-click',
              'touchscreen',
              'voice',
              'eeg',
              'meg',
              'fmri',
              'fnirs',
              'eye-tracking',
              'pupillometry',
              'mouse-tracking',
              'emg',
              'skin-conductance',
              'ecog',
              'custom',
            ],
            maxLength: 128,
          },
          features: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#featureMap',
          },
        },
      },
    },
  },
  PubLayersJudgmentExperimentDef: {
    lexicon: 1,
    id: 'pub.layers.judgment.experimentDef',
    defs: {
      main: {
        type: 'record',
        description: 'Definition of an annotation or judgment experiment.',
        key: 'tid',
        record: {
          type: 'object',
          required: ['name', 'createdAt'],
          properties: {
            name: {
              type: 'string',
              maxLength: 512,
            },
            description: {
              type: 'string',
              maxLength: 50000,
            },
            measureTypeUri: {
              type: 'string',
              format: 'at-uri',
              description:
                'AT-URI of the measure type definition node. Community-expandable via knowledge graph.',
            },
            measureType: {
              type: 'string',
              description:
                'What property or behavior is being measured (fallback when measureTypeUri unavailable).',
              knownValues: [
                'acceptability',
                'inference',
                'similarity',
                'plausibility',
                'comprehension',
                'preference',
                'extraction',
                'reading-time',
                'production',
                'custom',
              ],
              maxLength: 128,
            },
            taskTypeUri: {
              type: 'string',
              format: 'at-uri',
              description:
                'AT-URI of the response instrument definition node. Community-expandable via knowledge graph.',
            },
            taskType: {
              type: 'string',
              description:
                'Response instrument: how the response is collected (fallback when taskTypeUri unavailable).',
              knownValues: [
                'forced-choice',
                'multi-select',
                'ordinal-scale',
                'magnitude',
                'binary',
                'categorical',
                'free-text',
                'cloze',
                'span-labeling',
                'custom',
              ],
              maxLength: 128,
            },
            guidelines: {
              type: 'string',
              maxLength: 100000,
            },
            ontologyRef: {
              type: 'string',
              format: 'at-uri',
            },
            personaRef: {
              type: 'string',
              format: 'at-uri',
            },
            corpusRef: {
              type: 'string',
              format: 'at-uri',
            },
            templateRefs: {
              type: 'array',
              description:
                'References to pub.layers.resource#template records used to generate stimuli for this experiment.',
              maxLength: 64,
              items: {
                type: 'string',
                format: 'at-uri',
              },
            },
            collectionRefs: {
              type: 'array',
              description:
                'References to pub.layers.resource#collection records providing filler pools for this experiment.',
              maxLength: 64,
              items: {
                type: 'string',
                format: 'at-uri',
              },
            },
            scaleMin: {
              type: 'integer',
              description: 'Minimum scale value for ordinal-scale judgments.',
            },
            scaleMax: {
              type: 'integer',
              description: 'Maximum scale value.',
            },
            labels: {
              type: 'array',
              description: 'Available labels for categorical judgments.',
              maxLength: 256,
              items: {
                type: 'string',
                maxLength: 512,
              },
            },
            knowledgeRefs: {
              type: 'array',
              description:
                'Knowledge graph references (e.g., theoretical framework, methodology citation, task ontology).',
              maxLength: 32,
              items: {
                type: 'ref',
                ref: 'lex:pub.layers.defs#knowledgeRef',
              },
            },
            presentation: {
              type: 'ref',
              ref: 'lex:pub.layers.judgment.defs#presentationSpec',
              description: 'How stimuli are displayed to participants.',
            },
            recordingMethods: {
              type: 'array',
              description: 'Data capture instruments used in this experiment.',
              maxLength: 16,
              items: {
                type: 'ref',
                ref: 'lex:pub.layers.judgment.defs#recordingMethod',
              },
            },
            design: {
              type: 'ref',
              ref: 'lex:pub.layers.judgment.defs#experimentDesign',
              description:
                'Experiment design parameters: list constraints, distribution strategy, item order.',
            },
            features: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#featureMap',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
          },
        },
      },
    },
  },
  PubLayersJudgmentGetAgreementReport: {
    lexicon: 1,
    id: 'pub.layers.judgment.getAgreementReport',
    defs: {
      main: {
        type: 'query',
        description: 'Get a single agreement report by its AT-URI.',
        parameters: {
          type: 'params',
          required: ['uri'],
          properties: {
            uri: {
              type: 'string',
              format: 'at-uri',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['uri', 'cid', 'value'],
            properties: {
              uri: {
                type: 'string',
                format: 'at-uri',
              },
              cid: {
                type: 'string',
                format: 'cid',
              },
              value: {
                type: 'ref',
                ref: 'lex:pub.layers.judgment.agreementReport#main',
              },
            },
          },
        },
        errors: [
          {
            name: 'RecordNotFound',
          },
        ],
      },
    },
  },
  PubLayersJudgmentGetExperimentDef: {
    lexicon: 1,
    id: 'pub.layers.judgment.getExperimentDef',
    defs: {
      main: {
        type: 'query',
        description: 'Get a single experiment definition by its AT-URI.',
        parameters: {
          type: 'params',
          required: ['uri'],
          properties: {
            uri: {
              type: 'string',
              format: 'at-uri',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['uri', 'cid', 'value'],
            properties: {
              uri: {
                type: 'string',
                format: 'at-uri',
              },
              cid: {
                type: 'string',
                format: 'cid',
              },
              value: {
                type: 'ref',
                ref: 'lex:pub.layers.judgment.experimentDef#main',
              },
            },
          },
        },
        errors: [
          {
            name: 'RecordNotFound',
          },
        ],
      },
    },
  },
  PubLayersJudgmentGetJudgmentSet: {
    lexicon: 1,
    id: 'pub.layers.judgment.getJudgmentSet',
    defs: {
      main: {
        type: 'query',
        description: 'Get a single judgment set by its AT-URI.',
        parameters: {
          type: 'params',
          required: ['uri'],
          properties: {
            uri: {
              type: 'string',
              format: 'at-uri',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['uri', 'cid', 'value'],
            properties: {
              uri: {
                type: 'string',
                format: 'at-uri',
              },
              cid: {
                type: 'string',
                format: 'cid',
              },
              value: {
                type: 'ref',
                ref: 'lex:pub.layers.judgment.judgmentSet#main',
              },
            },
          },
        },
        errors: [
          {
            name: 'RecordNotFound',
          },
        ],
      },
    },
  },
  PubLayersJudgmentJudgmentSet: {
    lexicon: 1,
    id: 'pub.layers.judgment.judgmentSet',
    defs: {
      main: {
        type: 'record',
        description:
          'A set of judgments from a single annotator for an experiment.',
        key: 'tid',
        record: {
          type: 'object',
          required: ['experimentRef', 'judgments', 'createdAt'],
          properties: {
            experimentRef: {
              type: 'string',
              format: 'at-uri',
            },
            agent: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#agentRef',
              description:
                'The agent (human annotator, ML model, crowd worker, etc.) who produced this judgment set. Use did for ATProto-native annotators, id for anonymized/platform-specific identifiers, knowledgeRef for ORCID or model cards.',
            },
            judgments: {
              type: 'array',
              items: {
                type: 'ref',
                ref: 'lex:pub.layers.judgment.defs#judgment',
              },
            },
            metadata: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#annotationMetadata',
            },
            knowledgeRefs: {
              type: 'array',
              description:
                'Knowledge graph references (e.g., crowdsourcing platform, annotator population, methodology source).',
              maxLength: 32,
              items: {
                type: 'ref',
                ref: 'lex:pub.layers.defs#knowledgeRef',
              },
            },
            features: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#featureMap',
              description:
                'Open-ended features (e.g., annotator demographics, session metadata, completion time, payment info).',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
          },
        },
      },
    },
  },
  PubLayersJudgmentListAgreementReports: {
    lexicon: 1,
    id: 'pub.layers.judgment.listAgreementReports',
    defs: {
      main: {
        type: 'query',
        description: 'List agreement reports.',
        parameters: {
          type: 'params',
          required: ['experimentRef'],
          properties: {
            experimentRef: {
              type: 'string',
              format: 'at-uri',
            },
            metric: {
              type: 'string',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
            },
            cursor: {
              type: 'string',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['records'],
            properties: {
              cursor: {
                type: 'string',
              },
              records: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:pub.layers.judgment.listAgreementReports#recordView',
                },
              },
            },
          },
        },
      },
      recordView: {
        type: 'object',
        required: ['uri', 'cid', 'value'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          cid: {
            type: 'string',
            format: 'cid',
          },
          value: {
            type: 'ref',
            ref: 'lex:pub.layers.judgment.agreementReport#main',
          },
        },
      },
    },
  },
  PubLayersJudgmentListExperimentDefs: {
    lexicon: 1,
    id: 'pub.layers.judgment.listExperimentDefs',
    defs: {
      main: {
        type: 'query',
        description: 'List experiment definitions.',
        parameters: {
          type: 'params',
          required: ['repo'],
          properties: {
            repo: {
              type: 'string',
              format: 'at-identifier',
            },
            measureType: {
              type: 'string',
            },
            taskType: {
              type: 'string',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
            },
            cursor: {
              type: 'string',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['records'],
            properties: {
              cursor: {
                type: 'string',
              },
              records: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:pub.layers.judgment.listExperimentDefs#recordView',
                },
              },
            },
          },
        },
      },
      recordView: {
        type: 'object',
        required: ['uri', 'cid', 'value'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          cid: {
            type: 'string',
            format: 'cid',
          },
          value: {
            type: 'ref',
            ref: 'lex:pub.layers.judgment.experimentDef#main',
          },
        },
      },
    },
  },
  PubLayersJudgmentListJudgmentSets: {
    lexicon: 1,
    id: 'pub.layers.judgment.listJudgmentSets',
    defs: {
      main: {
        type: 'query',
        description: 'List judgment sets.',
        parameters: {
          type: 'params',
          required: ['experimentRef'],
          properties: {
            experimentRef: {
              type: 'string',
              format: 'at-uri',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
            },
            cursor: {
              type: 'string',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['records'],
            properties: {
              cursor: {
                type: 'string',
              },
              records: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:pub.layers.judgment.listJudgmentSets#recordView',
                },
              },
            },
          },
        },
      },
      recordView: {
        type: 'object',
        required: ['uri', 'cid', 'value'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          cid: {
            type: 'string',
            format: 'cid',
          },
          value: {
            type: 'ref',
            ref: 'lex:pub.layers.judgment.judgmentSet#main',
          },
        },
      },
    },
  },
  PubLayersMediaDefs: {
    lexicon: 1,
    id: 'pub.layers.media.defs',
    defs: {
      audioInfo: {
        type: 'object',
        description:
          'Composable audio metadata. Attach to any media record representing audio content: standalone audio files, audio tracks in video, etc.',
        properties: {
          sampleRate: {
            type: 'integer',
            description:
              'Audio sample rate in Hz (e.g., 8000, 16000, 22050, 44100, 48000).',
            minimum: 1,
          },
          channels: {
            type: 'integer',
            description: 'Number of audio channels.',
            minimum: 1,
          },
          bitDepth: {
            type: 'integer',
            description: 'Audio bit depth (e.g., 16, 24, 32).',
            minimum: 1,
          },
          codec: {
            type: 'string',
            description:
              "Audio codec identifier (e.g., 'pcm_s16le', 'aac', 'opus', 'flac').",
            maxLength: 128,
          },
          bitRate: {
            type: 'integer',
            description: 'Audio bitrate in bits per second.',
            minimum: 1,
          },
          bitRateMode: {
            type: 'string',
            description: 'Bitrate mode.',
            knownValues: ['cbr', 'vbr'],
            maxLength: 16,
          },
          numberOfSamples: {
            type: 'integer',
            description:
              'Total number of audio samples. Enables sample-accurate alignment.',
            minimum: 0,
          },
          speakerCount: {
            type: 'integer',
            description:
              'Number of distinct speakers (for spoken language data).',
            minimum: 0,
          },
          transcriptRef: {
            type: 'string',
            format: 'at-uri',
            description:
              'AT-URI of a pub.layers.expression containing the transcript.',
          },
          segmentationRef: {
            type: 'string',
            format: 'at-uri',
            description:
              'AT-URI of a pub.layers.segmentation record structuring the transcript.',
          },
        },
      },
      videoInfo: {
        type: 'object',
        description:
          'Composable video metadata. Attach to any media record representing video content.',
        properties: {
          width: {
            type: 'integer',
            description: 'Width in pixels.',
            minimum: 1,
          },
          height: {
            type: 'integer',
            description: 'Height in pixels.',
            minimum: 1,
          },
          frameRate: {
            type: 'integer',
            description:
              'Frame rate scaled by 100 (e.g., 2997 = 29.97fps). Avoids floats.',
            minimum: 1,
          },
          codec: {
            type: 'string',
            description:
              "Video codec identifier (e.g., 'h264', 'h265', 'vp9', 'av1', 'prores').",
            maxLength: 128,
          },
          aspectRatio: {
            type: 'string',
            description: "Display aspect ratio (e.g., '16:9', '4:3', '1:1').",
            maxLength: 32,
          },
          colorSpace: {
            type: 'string',
            description: 'Color space.',
            knownValues: ['rgb', 'yuv420', 'yuv422', 'yuv444', 'grayscale'],
            maxLength: 32,
          },
          bitRate: {
            type: 'integer',
            description: 'Video bitrate in bits per second.',
            minimum: 1,
          },
          scanType: {
            type: 'string',
            description: 'Scan type. Affects frame extraction for annotation.',
            knownValues: ['progressive', 'interlaced'],
            maxLength: 32,
          },
        },
      },
      documentInfo: {
        type: 'object',
        description:
          'Composable document/image metadata. Attach to any media record representing scanned documents, manuscripts, printed text, or other page-based media for OCR/HTR annotation workflows.',
        properties: {
          dpi: {
            type: 'integer',
            description:
              'Scanning resolution in dots per inch (300+ recommended for OCR).',
            minimum: 1,
          },
          colorMode: {
            type: 'string',
            description: 'Scan color mode.',
            knownValues: ['color', 'grayscale', 'bitonal'],
            maxLength: 32,
          },
          pageCount: {
            type: 'integer',
            description: 'Number of pages in the document.',
            minimum: 1,
          },
          scriptSystem: {
            type: 'string',
            description:
              "Writing system (ISO 15924 codes: 'Latn', 'Arab', 'Deva', 'Hans', 'Hant', 'Cyrl', 'Grek', etc.).",
            maxLength: 32,
          },
          writingDirection: {
            type: 'string',
            description: 'Primary text direction.',
            knownValues: ['ltr', 'rtl', 'ttb', 'btt'],
            maxLength: 8,
          },
          ocrEngine: {
            type: 'string',
            description:
              "OCR/HTR engine identifier (e.g., 'tesseract-5.3', 'transkribus', 'abbyy', 'google-vision').",
            maxLength: 256,
          },
        },
      },
    },
  },
  PubLayersMediaGetMedia: {
    lexicon: 1,
    id: 'pub.layers.media.getMedia',
    defs: {
      main: {
        type: 'query',
        description: 'Get a single media record by its AT-URI.',
        parameters: {
          type: 'params',
          required: ['uri'],
          properties: {
            uri: {
              type: 'string',
              format: 'at-uri',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['uri', 'cid', 'value'],
            properties: {
              uri: {
                type: 'string',
                format: 'at-uri',
              },
              cid: {
                type: 'string',
                format: 'cid',
              },
              value: {
                type: 'ref',
                ref: 'lex:pub.layers.media.media#main',
              },
            },
          },
        },
        errors: [
          {
            name: 'RecordNotFound',
          },
        ],
      },
    },
  },
  PubLayersMediaListMedia: {
    lexicon: 1,
    id: 'pub.layers.media.listMedia',
    defs: {
      main: {
        type: 'query',
        description: 'List media records.',
        parameters: {
          type: 'params',
          required: ['repo'],
          properties: {
            repo: {
              type: 'string',
              format: 'at-identifier',
            },
            kind: {
              type: 'string',
              maxLength: 128,
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
            },
            cursor: {
              type: 'string',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['records'],
            properties: {
              cursor: {
                type: 'string',
              },
              records: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:pub.layers.media.listMedia#recordView',
                },
              },
            },
          },
        },
      },
      recordView: {
        type: 'object',
        required: ['uri', 'cid', 'value'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          cid: {
            type: 'string',
            format: 'cid',
          },
          value: {
            type: 'ref',
            ref: 'lex:pub.layers.media.media#main',
          },
        },
      },
    },
  },
  PubLayersMediaMedia: {
    lexicon: 1,
    id: 'pub.layers.media.media',
    description:
      'Media source records for audio, video, image, and document data associated with expressions. Modality-specific metadata is factored into composable object types (audioInfo, videoInfo, documentInfo) so that multimodal media can carry all relevant technical metadata.',
    defs: {
      main: {
        type: 'record',
        description:
          'A media source record (audio, video, image, or document) that can be referenced by expressions and annotations. Modality-specific metadata lives in composable audioInfo/videoInfo/documentInfo objects.',
        key: 'tid',
        record: {
          type: 'object',
          required: ['kind', 'createdAt'],
          properties: {
            kindUri: {
              type: 'string',
              format: 'at-uri',
              description:
                'AT-URI of the media kind definition node. Community-expandable via knowledge graph.',
            },
            kind: {
              type: 'string',
              description:
                'Media kind slug (fallback when kindUri unavailable).',
              knownValues: ['audio', 'video', 'image', 'document'],
              maxLength: 128,
            },
            title: {
              type: 'string',
              maxLength: 1024,
            },
            description: {
              type: 'string',
              maxLength: 10000,
            },
            blob: {
              type: 'blob',
              description: 'The media blob.',
              accept: ['audio/*', 'video/*', 'image/*', 'application/pdf'],
              maxSize: 104857600,
            },
            externalUri: {
              type: 'string',
              format: 'uri',
              description: 'URI for externally hosted media.',
              maxLength: 2048,
            },
            mimeType: {
              type: 'string',
              maxLength: 128,
            },
            durationMs: {
              type: 'integer',
              description: 'Duration in milliseconds (for audio/video).',
              minimum: 0,
            },
            fileSizeBytes: {
              type: 'integer',
              description: 'File size in bytes.',
              minimum: 0,
            },
            parentMediaRef: {
              type: 'string',
              format: 'at-uri',
              description:
                'AT-URI of the parent media record this excerpt/clip was extracted from.',
            },
            startOffsetMs: {
              type: 'integer',
              description:
                'Offset in milliseconds where this excerpt starts within the parent media. Used with parentMediaRef.',
              minimum: 0,
            },
            audio: {
              type: 'ref',
              ref: 'lex:pub.layers.media.defs#audioInfo',
              description:
                'Audio-specific metadata. Present for audio files and videos with audio tracks.',
            },
            video: {
              type: 'ref',
              ref: 'lex:pub.layers.media.defs#videoInfo',
              description:
                'Video-specific metadata. Present for video files and image sequences.',
            },
            document: {
              type: 'ref',
              ref: 'lex:pub.layers.media.defs#documentInfo',
              description:
                'Document-specific metadata. Present for scanned documents, manuscripts, etc.',
            },
            language: {
              type: 'string',
              description: 'BCP-47 language tag.',
              maxLength: 32,
            },
            knowledgeRefs: {
              type: 'array',
              description: 'Knowledge graph references.',
              maxLength: 32,
              items: {
                type: 'ref',
                ref: 'lex:pub.layers.defs#knowledgeRef',
              },
            },
            metadata: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#annotationMetadata',
              description:
                'Provenance: who created/uploaded this media record, with what tool.',
            },
            features: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#featureMap',
              description:
                'Open-ended features: recording conditions, speaker metadata, quality metrics, consent, etc.',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
          },
        },
      },
    },
  },
  PubLayersOntologyDefs: {
    lexicon: 1,
    id: 'pub.layers.ontology.defs',
    defs: {
      roleSlot: {
        type: 'object',
        description:
          'A role/argument slot in a frame or situation type definition. Structurally parallel to pub.layers.resource#slot: both represent named positions with type constraints. roleSlot is ontology-level (what roles a frame type allows); resource slot is template-level (what variables a template exposes).',
        required: ['roleName'],
        properties: {
          roleName: {
            type: 'string',
            description: 'The role label (e.g., Agent, Patient, Theme, ARG0).',
            maxLength: 256,
          },
          roleDescription: {
            type: 'string',
            maxLength: 2048,
          },
          fillerTypeRefs: {
            type: 'array',
            description:
              'References to allowed filler types (pub.layers.ontology#typeDef AT-URIs).',
            maxLength: 32,
            items: {
              type: 'string',
              format: 'at-uri',
            },
          },
          collectionRef: {
            type: 'string',
            format: 'at-uri',
            description:
              'AT-URI of a pub.layers.resource#collection constraining allowed fillers.',
          },
          required: {
            type: 'boolean',
            description: 'Whether this role is obligatory.',
          },
          defaultValue: {
            type: 'string',
            description: 'Default filler value if not explicitly filled.',
            maxLength: 4096,
          },
          constraints: {
            type: 'array',
            description:
              'Declarative constraints on fillers of this role (e.g., selectional restrictions, agreement requirements).',
            maxLength: 32,
            items: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#constraint',
            },
          },
          knowledgeRefs: {
            type: 'array',
            maxLength: 16,
            items: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#knowledgeRef',
            },
          },
          features: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#featureMap',
            description:
              'Open-ended features for this role slot (e.g., semantic type, animacy preference, optionality conditions).',
          },
        },
      },
    },
  },
  PubLayersOntologyGetOntology: {
    lexicon: 1,
    id: 'pub.layers.ontology.getOntology',
    defs: {
      main: {
        type: 'query',
        description: 'Get a single ontology by its AT-URI.',
        parameters: {
          type: 'params',
          required: ['uri'],
          properties: {
            uri: {
              type: 'string',
              format: 'at-uri',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['uri', 'cid', 'value'],
            properties: {
              uri: {
                type: 'string',
                format: 'at-uri',
              },
              cid: {
                type: 'string',
                format: 'cid',
              },
              value: {
                type: 'ref',
                ref: 'lex:pub.layers.ontology.ontology#main',
              },
            },
          },
        },
        errors: [
          {
            name: 'RecordNotFound',
          },
        ],
      },
    },
  },
  PubLayersOntologyGetTypeDef: {
    lexicon: 1,
    id: 'pub.layers.ontology.getTypeDef',
    defs: {
      main: {
        type: 'query',
        description: 'Get a single type definition by its AT-URI.',
        parameters: {
          type: 'params',
          required: ['uri'],
          properties: {
            uri: {
              type: 'string',
              format: 'at-uri',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['uri', 'cid', 'value'],
            properties: {
              uri: {
                type: 'string',
                format: 'at-uri',
              },
              cid: {
                type: 'string',
                format: 'cid',
              },
              value: {
                type: 'ref',
                ref: 'lex:pub.layers.ontology.typeDef#main',
              },
            },
          },
        },
        errors: [
          {
            name: 'RecordNotFound',
          },
        ],
      },
    },
  },
  PubLayersOntologyListOntologies: {
    lexicon: 1,
    id: 'pub.layers.ontology.listOntologies',
    defs: {
      main: {
        type: 'query',
        description: 'List ontologies.',
        parameters: {
          type: 'params',
          required: ['repo'],
          properties: {
            repo: {
              type: 'string',
              format: 'at-identifier',
            },
            domain: {
              type: 'string',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
            },
            cursor: {
              type: 'string',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['records'],
            properties: {
              cursor: {
                type: 'string',
              },
              records: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:pub.layers.ontology.listOntologies#recordView',
                },
              },
            },
          },
        },
      },
      recordView: {
        type: 'object',
        required: ['uri', 'cid', 'value'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          cid: {
            type: 'string',
            format: 'cid',
          },
          value: {
            type: 'ref',
            ref: 'lex:pub.layers.ontology.ontology#main',
          },
        },
      },
    },
  },
  PubLayersOntologyListTypeDefs: {
    lexicon: 1,
    id: 'pub.layers.ontology.listTypeDefs',
    defs: {
      main: {
        type: 'query',
        description: 'List type definitions.',
        parameters: {
          type: 'params',
          required: ['ontologyRef'],
          properties: {
            ontologyRef: {
              type: 'string',
              format: 'at-uri',
            },
            typeKind: {
              type: 'string',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
            },
            cursor: {
              type: 'string',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['records'],
            properties: {
              cursor: {
                type: 'string',
              },
              records: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:pub.layers.ontology.listTypeDefs#recordView',
                },
              },
            },
          },
        },
      },
      recordView: {
        type: 'object',
        required: ['uri', 'cid', 'value'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          cid: {
            type: 'string',
            format: 'cid',
          },
          value: {
            type: 'ref',
            ref: 'lex:pub.layers.ontology.typeDef#main',
          },
        },
      },
    },
  },
  PubLayersOntologyOntology: {
    lexicon: 1,
    id: 'pub.layers.ontology.ontology',
    defs: {
      main: {
        type: 'record',
        description:
          'An annotation ontology: a collection of typed definitions (entity types, situation types, role types, relation types) that together form a complete annotation framework.',
        key: 'tid',
        record: {
          type: 'object',
          required: ['name', 'createdAt'],
          properties: {
            name: {
              type: 'string',
              description: 'Human-readable name for this ontology.',
              maxLength: 512,
            },
            description: {
              type: 'string',
              description:
                "Detailed description of the ontology's purpose and scope.",
              maxLength: 10000,
            },
            version: {
              type: 'string',
              description: 'Semantic version string.',
              maxLength: 32,
            },
            domainUri: {
              type: 'string',
              format: 'at-uri',
              description:
                'AT-URI of the domain definition node. Community-expandable via knowledge graph.',
            },
            domain: {
              type: 'string',
              description: 'Domain slug (fallback when domainUri unavailable).',
              knownValues: [
                'general',
                'biomedical',
                'legal',
                'financial',
                'news',
                'social-media',
                'scientific',
                'intelligence',
                'dialogue',
                'multimodal',
                'custom',
              ],
              maxLength: 128,
            },
            parentRef: {
              type: 'string',
              format: 'at-uri',
              description: 'Reference to a parent ontology this one extends.',
            },
            personaRef: {
              type: 'string',
              format: 'at-uri',
              description:
                'Reference to the persona that created/owns this ontology.',
            },
            knowledgeRefs: {
              type: 'array',
              description:
                'Knowledge graph references grounding this ontology.',
              maxLength: 64,
              items: {
                type: 'ref',
                ref: 'lex:pub.layers.defs#knowledgeRef',
              },
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
          },
        },
      },
    },
  },
  PubLayersOntologyTypeDef: {
    lexicon: 1,
    id: 'pub.layers.ontology.typeDef',
    defs: {
      main: {
        type: 'record',
        description:
          'A type definition within an ontology. Covers entity types, situation types, role types, and relation types in a single unified model.',
        key: 'tid',
        record: {
          type: 'object',
          required: ['ontologyRef', 'name', 'typeKind', 'createdAt'],
          properties: {
            ontologyRef: {
              type: 'string',
              format: 'at-uri',
              description: 'The ontology this type belongs to.',
            },
            name: {
              type: 'string',
              description: 'The type name/label.',
              maxLength: 512,
            },
            typeKindUri: {
              type: 'string',
              format: 'at-uri',
              description:
                'AT-URI of the type kind definition node. Community-expandable via knowledge graph.',
            },
            typeKind: {
              type: 'string',
              description:
                'Type kind slug (fallback when typeKindUri unavailable).',
              knownValues: [
                'entity-type',
                'situation-type',
                'role-type',
                'relation-type',
                'attribute-type',
              ],
              maxLength: 128,
            },
            gloss: {
              type: 'string',
              description:
                'Rich text definition/gloss of this type. May include references to other types and Wikidata entities, following FOVEA conventions.',
              maxLength: 10000,
            },
            parentTypeRef: {
              type: 'string',
              format: 'at-uri',
              description:
                'Reference to a parent type (for type hierarchies/inheritance).',
            },
            allowedRoles: {
              type: 'array',
              description:
                'For frame/situation types: the roles that can be filled.',
              maxLength: 64,
              items: {
                type: 'ref',
                ref: 'lex:pub.layers.ontology.defs#roleSlot',
              },
            },
            allowedValues: {
              type: 'array',
              description: 'For attribute types: enumerated allowed values.',
              maxLength: 256,
              items: {
                type: 'string',
                maxLength: 512,
              },
            },
            knowledgeRefs: {
              type: 'array',
              description:
                'Knowledge graph groundings (Wikidata, chive.pub, FrameNet, etc.).',
              maxLength: 32,
              items: {
                type: 'ref',
                ref: 'lex:pub.layers.defs#knowledgeRef',
              },
            },
            features: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#featureMap',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
          },
        },
      },
    },
  },
  PubLayersPersonaGetPersona: {
    lexicon: 1,
    id: 'pub.layers.persona.getPersona',
    defs: {
      main: {
        type: 'query',
        description: 'Get a single persona by its AT-URI.',
        parameters: {
          type: 'params',
          required: ['uri'],
          properties: {
            uri: {
              type: 'string',
              format: 'at-uri',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['uri', 'cid', 'value'],
            properties: {
              uri: {
                type: 'string',
                format: 'at-uri',
              },
              cid: {
                type: 'string',
                format: 'cid',
              },
              value: {
                type: 'ref',
                ref: 'lex:pub.layers.persona.persona#main',
              },
            },
          },
        },
        errors: [
          {
            name: 'RecordNotFound',
          },
        ],
      },
    },
  },
  PubLayersPersonaListPersonas: {
    lexicon: 1,
    id: 'pub.layers.persona.listPersonas',
    defs: {
      main: {
        type: 'query',
        description: 'List personas.',
        parameters: {
          type: 'params',
          required: ['repo'],
          properties: {
            repo: {
              type: 'string',
              format: 'at-identifier',
            },
            domain: {
              type: 'string',
              maxLength: 256,
            },
            kind: {
              type: 'string',
              maxLength: 128,
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
            },
            cursor: {
              type: 'string',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['records'],
            properties: {
              cursor: {
                type: 'string',
              },
              records: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:pub.layers.persona.listPersonas#recordView',
                },
              },
            },
          },
        },
      },
      recordView: {
        type: 'object',
        required: ['uri', 'cid', 'value'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          cid: {
            type: 'string',
            format: 'cid',
          },
          value: {
            type: 'ref',
            ref: 'lex:pub.layers.persona.persona#main',
          },
        },
      },
    },
  },
  PubLayersPersonaPersona: {
    lexicon: 1,
    id: 'pub.layers.persona.persona',
    description:
      "Persona records define annotation frameworks and analyst perspectives. Different personas can annotate the same data with different ontologies and interpretive frameworks, following FOVEA's persona-based approach.",
    defs: {
      main: {
        type: 'record',
        description:
          "A persona representing an annotator's role, expertise, and interpretive framework.",
        key: 'tid',
        record: {
          type: 'object',
          required: ['name', 'createdAt'],
          properties: {
            name: {
              type: 'string',
              description:
                "The persona name (e.g., 'Syntactician', 'Intelligence Analyst', 'Biomedical NER Annotator').",
              maxLength: 256,
            },
            description: {
              type: 'string',
              description:
                "Description of the persona's role, expertise, and information needs.",
              maxLength: 10000,
            },
            domainUri: {
              type: 'string',
              format: 'at-uri',
              description:
                'AT-URI of the domain definition node. Community-expandable via knowledge graph.',
            },
            domain: {
              type: 'string',
              description: 'Domain slug (fallback when domainUri unavailable).',
              knownValues: [
                'linguistics',
                'nlp',
                'biomedical',
                'legal',
                'intelligence',
                'social-science',
                'humanities',
                'custom',
              ],
              maxLength: 256,
            },
            kindUri: {
              type: 'string',
              format: 'at-uri',
              description:
                'AT-URI of the persona kind definition node. Community-expandable via knowledge graph.',
            },
            kind: {
              type: 'string',
              description:
                'Persona kind slug (fallback when kindUri unavailable).',
              knownValues: [
                'human-annotator',
                'ml-model',
                'guidelines-persona',
                'expert-panel',
                'crowd-worker',
                'custom',
              ],
              maxLength: 128,
            },
            parentRef: {
              type: 'string',
              format: 'at-uri',
              description:
                "AT-URI of a parent persona this one specializes (e.g., 'Biomedical NER Annotator' specializes 'NER Annotator').",
            },
            ontologyRefs: {
              type: 'array',
              description: 'Ontologies this persona uses for annotation.',
              maxLength: 32,
              items: {
                type: 'string',
                format: 'at-uri',
              },
            },
            guidelines: {
              type: 'string',
              description: 'Annotation guidelines text.',
              maxLength: 100000,
            },
            guidelinesBlob: {
              type: 'blob',
              description: 'Annotation guidelines document.',
              accept: ['application/pdf', 'text/markdown', 'text/plain'],
              maxSize: 10485760,
            },
            knowledgeRefs: {
              type: 'array',
              description:
                'Knowledge graph references (e.g., ORCID, institutional identifiers, Wikidata for organizations).',
              maxLength: 32,
              items: {
                type: 'ref',
                ref: 'lex:pub.layers.defs#knowledgeRef',
              },
            },
            features: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#featureMap',
              description:
                'Open-ended features: expertise level, certification, language proficiency, inter-annotator reliability, etc.',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
          },
        },
      },
    },
  },
  PubLayersResourceCollection: {
    lexicon: 1,
    id: 'pub.layers.resource.collection',
    defs: {
      main: {
        type: 'record',
        description:
          'A named collection of linguistic resource entries. Abstract enough to represent bead Lexicons, FrameNet frame inventories, PropBank frame files, WordNet synsets, morphological paradigm tables, gazetteers, stop-word lists, etc.',
        key: 'tid',
        record: {
          type: 'object',
          required: ['name', 'createdAt'],
          properties: {
            name: {
              type: 'string',
              description: 'Human-readable name for this collection.',
              maxLength: 512,
            },
            description: {
              type: 'string',
              maxLength: 10000,
            },
            kindUri: {
              type: 'string',
              format: 'at-uri',
              description:
                'AT-URI of the collection kind definition node. Community-expandable via knowledge graph.',
            },
            kind: {
              type: 'string',
              description:
                'Collection kind slug (fallback when kindUri unavailable).',
              knownValues: [
                'lexicon',
                'frame-inventory',
                'gazetteer',
                'paradigm',
                'stop-list',
                'stimulus-pool',
                'custom',
              ],
              maxLength: 128,
            },
            language: {
              type: 'string',
              description: 'BCP-47 language tag.',
              maxLength: 32,
            },
            version: {
              type: 'string',
              description:
                "Version string (e.g., 'FrameNet 1.7', 'PropBank 3.4').",
              maxLength: 64,
            },
            ontologyRef: {
              type: 'string',
              format: 'at-uri',
              description:
                'Reference to a pub.layers.ontology defining the type system for entries in this collection.',
            },
            knowledgeRefs: {
              type: 'array',
              maxLength: 32,
              items: {
                type: 'ref',
                ref: 'lex:pub.layers.defs#knowledgeRef',
              },
            },
            metadata: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#annotationMetadata',
              description:
                'Provenance: who curated this collection, with what tool.',
            },
            features: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#featureMap',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
          },
        },
      },
    },
  },
  PubLayersResourceCollectionMembership: {
    lexicon: 1,
    id: 'pub.layers.resource.collectionMembership',
    defs: {
      main: {
        type: 'record',
        description:
          'Links an entry to a collection. Separate record enables many-to-many relationships (an entry can belong to multiple collections) and decentralized curation (anyone can propose membership).',
        key: 'tid',
        record: {
          type: 'object',
          required: ['collectionRef', 'entryRef', 'createdAt'],
          properties: {
            collectionRef: {
              type: 'string',
              format: 'at-uri',
              description: 'AT-URI of the collection.',
            },
            entryRef: {
              type: 'string',
              format: 'at-uri',
              description: 'AT-URI of the entry.',
            },
            ordinal: {
              type: 'integer',
              description: 'Optional ordering position within the collection.',
              minimum: 0,
            },
            metadata: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#annotationMetadata',
              description:
                'Provenance: who added this entry to this collection, when, with what tool.',
            },
            features: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#featureMap',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
          },
        },
      },
    },
  },
  PubLayersResourceDefs: {
    lexicon: 1,
    id: 'pub.layers.resource.defs',
    description: 'Shared object definitions for the resource namespace.',
    defs: {
      slot: {
        type: 'object',
        description:
          "A named variable slot in a template. Generalizes bead's Slot (template variable position with constraints and defaults), ontology roleSlots (argument positions with filler type constraints), and similar parameterized positions in any structured linguistic pattern. Slots are composable: they can reference collections of allowed fillers, ontology types, or express arbitrary constraints.",
        required: ['name'],
        properties: {
          name: {
            type: 'string',
            description:
              "Slot name (used as placeholder key in template text, e.g., 'subject', 'verb', 'arg0').",
            maxLength: 256,
          },
          description: {
            type: 'string',
            maxLength: 2048,
          },
          required: {
            type: 'boolean',
            description: 'Whether this slot must be filled.',
          },
          defaultValue: {
            type: 'string',
            description: 'Default filler value if not explicitly filled.',
            maxLength: 4096,
          },
          collectionRef: {
            type: 'string',
            format: 'at-uri',
            description:
              'AT-URI of a resource collection constraining allowed fillers.',
          },
          ontologyTypeRef: {
            type: 'string',
            format: 'at-uri',
            description:
              'AT-URI of a pub.layers.ontology#typeDef constraining the filler type.',
          },
          fillerTypeRefs: {
            type: 'array',
            description:
              'Multiple allowed filler type references (disjunctive constraint).',
            maxLength: 32,
            items: {
              type: 'string',
              format: 'at-uri',
            },
          },
          constraints: {
            type: 'array',
            description:
              'Slot-level constraints (e.g., \'self.pos == "VERB"\', \'self.features.number == "sg"\').',
            maxLength: 32,
            items: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#constraint',
            },
          },
          knowledgeRefs: {
            type: 'array',
            maxLength: 16,
            items: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#knowledgeRef',
            },
          },
          features: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#featureMap',
          },
        },
      },
      slotFilling: {
        type: 'object',
        description:
          'A single slot→filler mapping in a filled template. The filler can be an entry reference (AT-URI to a resource entry), a literal value, or both (entry reference with rendered surface form).',
        required: ['slotName'],
        properties: {
          slotName: {
            type: 'string',
            description:
              'Name of the slot being filled (must match a slot name in the template).',
            maxLength: 256,
          },
          entryRef: {
            type: 'string',
            format: 'at-uri',
            description: 'AT-URI of the resource entry filling this slot.',
          },
          literalValue: {
            type: 'string',
            description:
              'Literal string value for this slot (used when no entry reference is needed, or as override).',
            maxLength: 4096,
          },
          renderedForm: {
            type: 'string',
            description:
              'The surface form as rendered in the filled text (may differ from entry form due to morphological inflection, agreement, etc.).',
            maxLength: 4096,
          },
          features: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#featureMap',
          },
        },
      },
      templateMember: {
        type: 'object',
        description:
          'A member in a template composition. References either a template or a nested composition.',
        required: ['ordinal'],
        properties: {
          ordinal: {
            type: 'integer',
            description: 'Position in the composition (0-based).',
            minimum: 0,
          },
          templateRef: {
            type: 'string',
            format: 'at-uri',
            description: 'AT-URI of a template record.',
          },
          compositionRef: {
            type: 'string',
            format: 'at-uri',
            description:
              'AT-URI of a nested templateComposition (for tree structures).',
          },
          label: {
            type: 'string',
            description:
              "Optional label for this member (e.g., 'context', 'target', 'filler').",
            maxLength: 256,
          },
          features: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#featureMap',
          },
        },
      },
      mweComponent: {
        type: 'object',
        description: 'A component of a multi-word expression entry.',
        required: ['form'],
        properties: {
          form: {
            type: 'string',
            description: 'Surface form of this component.',
            maxLength: 1024,
          },
          lemma: {
            type: 'string',
            description: 'Lemma/citation form of this component.',
            maxLength: 1024,
          },
          position: {
            type: 'integer',
            description: 'Position in the MWE (0-based).',
            minimum: 0,
          },
          isHead: {
            type: 'boolean',
            description: 'Whether this component is the head of the MWE.',
          },
          features: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#featureMap',
          },
        },
      },
    },
  },
  PubLayersResourceEntry: {
    lexicon: 1,
    id: 'pub.layers.resource.entry',
    defs: {
      main: {
        type: 'record',
        description:
          'A linguistic resource entry: a lexical item, frame element filler, morphological paradigm cell, or any atomic unit in a structured linguistic collection. Abstract enough to represent bead LexicalItems, FrameNet lexical units, PropBank rolesets, WordNet synset members, morphological paradigm cells, etc.',
        key: 'tid',
        record: {
          type: 'object',
          required: ['form', 'createdAt'],
          properties: {
            lemma: {
              type: 'string',
              description: 'Canonical/citation form.',
              maxLength: 1024,
            },
            form: {
              type: 'string',
              description: 'Surface form or string representation.',
              maxLength: 4096,
            },
            language: {
              type: 'string',
              description: 'BCP-47 language tag.',
              maxLength: 32,
            },
            ontologyTypeRef: {
              type: 'string',
              format: 'at-uri',
              description:
                'Reference to a pub.layers.ontology#typeDef classifying this entry.',
            },
            knowledgeRefs: {
              type: 'array',
              description:
                'Knowledge graph groundings (WordNet synset, FrameNet lexical unit, Wikidata, etc.).',
              maxLength: 32,
              items: {
                type: 'ref',
                ref: 'lex:pub.layers.defs#knowledgeRef',
              },
            },
            features: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#featureMap',
              description:
                'Open-ended features: pos, morphological features, frequency, register, etc.',
            },
            components: {
              type: 'array',
              description: 'For multi-word expressions: the component words.',
              maxLength: 32,
              items: {
                type: 'ref',
                ref: 'lex:pub.layers.resource.defs#mweComponent',
              },
            },
            mweKindUri: {
              type: 'string',
              format: 'at-uri',
              description:
                'AT-URI of the MWE kind definition node. Community-expandable via knowledge graph.',
            },
            mweKind: {
              type: 'string',
              description:
                'MWE kind slug (fallback when mweKindUri unavailable).',
              knownValues: [
                'compound',
                'phrasal-verb',
                'idiom',
                'light-verb',
                'named-entity',
                'collocation',
                'custom',
              ],
              maxLength: 128,
            },
            sourceRef: {
              type: 'string',
              format: 'at-uri',
              description:
                'AT-URI of the source record this entry was derived from (e.g., an annotation, another entry).',
            },
            metadata: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#annotationMetadata',
              description:
                'Provenance: who created this entry, with what tool, under what persona.',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
          },
        },
      },
    },
  },
  PubLayersResourceFilling: {
    lexicon: 1,
    id: 'pub.layers.resource.filling',
    defs: {
      main: {
        type: 'record',
        description:
          "A filled template: a template with all slots mapped to specific fillers, producing a rendered text. Generalizes bead's FilledTemplate and Item. The rendered text can optionally be materialized as a pub.layers.expression for annotation. Fillings are composable: they reference templates, entries, and communications via AT-URIs.",
        key: 'tid',
        record: {
          type: 'object',
          required: ['templateRef', 'slotFillings', 'createdAt'],
          properties: {
            templateRef: {
              type: 'string',
              format: 'at-uri',
              description: 'AT-URI of the template being filled.',
            },
            slotFillings: {
              type: 'array',
              description: 'The slot→filler mappings.',
              maxLength: 64,
              items: {
                type: 'ref',
                ref: 'lex:pub.layers.resource.defs#slotFilling',
              },
            },
            renderedText: {
              type: 'string',
              description: 'The fully rendered text after substitution.',
              maxLength: 100000,
            },
            expressionRef: {
              type: 'string',
              format: 'at-uri',
              description:
                'AT-URI of the pub.layers.expression materializing this filling (for annotation).',
            },
            strategyUri: {
              type: 'string',
              format: 'at-uri',
              description:
                'AT-URI of the filling strategy definition node. Community-expandable via knowledge graph.',
            },
            strategy: {
              type: 'string',
              description:
                'Filling strategy slug (fallback when strategyUri unavailable).',
              knownValues: [
                'exhaustive',
                'random',
                'stratified',
                'mlm',
                'csp',
                'mixed',
                'manual',
                'custom',
              ],
              maxLength: 128,
            },
            metadata: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#annotationMetadata',
              description:
                'Provenance: what tool/process generated this filling.',
            },
            knowledgeRefs: {
              type: 'array',
              description:
                'Knowledge graph references (e.g., generation model in a KB, sampling distribution, linguistic theory motivating the filling).',
              maxLength: 32,
              items: {
                type: 'ref',
                ref: 'lex:pub.layers.defs#knowledgeRef',
              },
            },
            features: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#featureMap',
              description:
                'Open-ended features: model name for MLM filling, seed for random, solver stats for CSP, etc.',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
          },
        },
      },
    },
  },
  PubLayersResourceGetCollection: {
    lexicon: 1,
    id: 'pub.layers.resource.getCollection',
    defs: {
      main: {
        type: 'query',
        description: 'Get a single resource collection by its AT-URI.',
        parameters: {
          type: 'params',
          required: ['uri'],
          properties: {
            uri: {
              type: 'string',
              format: 'at-uri',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['uri', 'cid', 'value'],
            properties: {
              uri: {
                type: 'string',
                format: 'at-uri',
              },
              cid: {
                type: 'string',
                format: 'cid',
              },
              value: {
                type: 'ref',
                ref: 'lex:pub.layers.resource.collection#main',
              },
            },
          },
        },
        errors: [
          {
            name: 'RecordNotFound',
          },
        ],
      },
    },
  },
  PubLayersResourceGetCollectionMembership: {
    lexicon: 1,
    id: 'pub.layers.resource.getCollectionMembership',
    defs: {
      main: {
        type: 'query',
        description: 'Get a single collection membership by its AT-URI.',
        parameters: {
          type: 'params',
          required: ['uri'],
          properties: {
            uri: {
              type: 'string',
              format: 'at-uri',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['uri', 'cid', 'value'],
            properties: {
              uri: {
                type: 'string',
                format: 'at-uri',
              },
              cid: {
                type: 'string',
                format: 'cid',
              },
              value: {
                type: 'ref',
                ref: 'lex:pub.layers.resource.collectionMembership#main',
              },
            },
          },
        },
        errors: [
          {
            name: 'RecordNotFound',
          },
        ],
      },
    },
  },
  PubLayersResourceGetEntry: {
    lexicon: 1,
    id: 'pub.layers.resource.getEntry',
    defs: {
      main: {
        type: 'query',
        description: 'Get a single resource entry by its AT-URI.',
        parameters: {
          type: 'params',
          required: ['uri'],
          properties: {
            uri: {
              type: 'string',
              format: 'at-uri',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['uri', 'cid', 'value'],
            properties: {
              uri: {
                type: 'string',
                format: 'at-uri',
              },
              cid: {
                type: 'string',
                format: 'cid',
              },
              value: {
                type: 'ref',
                ref: 'lex:pub.layers.resource.entry#main',
              },
            },
          },
        },
        errors: [
          {
            name: 'RecordNotFound',
          },
        ],
      },
    },
  },
  PubLayersResourceGetFilling: {
    lexicon: 1,
    id: 'pub.layers.resource.getFilling',
    defs: {
      main: {
        type: 'query',
        description: 'Get a single template filling by its AT-URI.',
        parameters: {
          type: 'params',
          required: ['uri'],
          properties: {
            uri: {
              type: 'string',
              format: 'at-uri',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['uri', 'cid', 'value'],
            properties: {
              uri: {
                type: 'string',
                format: 'at-uri',
              },
              cid: {
                type: 'string',
                format: 'cid',
              },
              value: {
                type: 'ref',
                ref: 'lex:pub.layers.resource.filling#main',
              },
            },
          },
        },
        errors: [
          {
            name: 'RecordNotFound',
          },
        ],
      },
    },
  },
  PubLayersResourceGetTemplate: {
    lexicon: 1,
    id: 'pub.layers.resource.getTemplate',
    defs: {
      main: {
        type: 'query',
        description: 'Get a single resource template by its AT-URI.',
        parameters: {
          type: 'params',
          required: ['uri'],
          properties: {
            uri: {
              type: 'string',
              format: 'at-uri',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['uri', 'cid', 'value'],
            properties: {
              uri: {
                type: 'string',
                format: 'at-uri',
              },
              cid: {
                type: 'string',
                format: 'cid',
              },
              value: {
                type: 'ref',
                ref: 'lex:pub.layers.resource.template#main',
              },
            },
          },
        },
        errors: [
          {
            name: 'RecordNotFound',
          },
        ],
      },
    },
  },
  PubLayersResourceGetTemplateComposition: {
    lexicon: 1,
    id: 'pub.layers.resource.getTemplateComposition',
    defs: {
      main: {
        type: 'query',
        description: 'Get a single template composition by its AT-URI.',
        parameters: {
          type: 'params',
          required: ['uri'],
          properties: {
            uri: {
              type: 'string',
              format: 'at-uri',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['uri', 'cid', 'value'],
            properties: {
              uri: {
                type: 'string',
                format: 'at-uri',
              },
              cid: {
                type: 'string',
                format: 'cid',
              },
              value: {
                type: 'ref',
                ref: 'lex:pub.layers.resource.templateComposition#main',
              },
            },
          },
        },
        errors: [
          {
            name: 'RecordNotFound',
          },
        ],
      },
    },
  },
  PubLayersResourceListCollectionMemberships: {
    lexicon: 1,
    id: 'pub.layers.resource.listCollectionMemberships',
    defs: {
      main: {
        type: 'query',
        description: 'List collection memberships.',
        parameters: {
          type: 'params',
          required: ['collectionRef'],
          properties: {
            collectionRef: {
              type: 'string',
              format: 'at-uri',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
            },
            cursor: {
              type: 'string',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['records'],
            properties: {
              cursor: {
                type: 'string',
              },
              records: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:pub.layers.resource.listCollectionMemberships#recordView',
                },
              },
            },
          },
        },
      },
      recordView: {
        type: 'object',
        required: ['uri', 'cid', 'value'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          cid: {
            type: 'string',
            format: 'cid',
          },
          value: {
            type: 'ref',
            ref: 'lex:pub.layers.resource.collectionMembership#main',
          },
        },
      },
    },
  },
  PubLayersResourceListCollections: {
    lexicon: 1,
    id: 'pub.layers.resource.listCollections',
    defs: {
      main: {
        type: 'query',
        description: 'List resource collections.',
        parameters: {
          type: 'params',
          required: ['repo'],
          properties: {
            repo: {
              type: 'string',
              format: 'at-identifier',
            },
            kind: {
              type: 'string',
            },
            language: {
              type: 'string',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
            },
            cursor: {
              type: 'string',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['records'],
            properties: {
              cursor: {
                type: 'string',
              },
              records: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:pub.layers.resource.listCollections#recordView',
                },
              },
            },
          },
        },
      },
      recordView: {
        type: 'object',
        required: ['uri', 'cid', 'value'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          cid: {
            type: 'string',
            format: 'cid',
          },
          value: {
            type: 'ref',
            ref: 'lex:pub.layers.resource.collection#main',
          },
        },
      },
    },
  },
  PubLayersResourceListEntries: {
    lexicon: 1,
    id: 'pub.layers.resource.listEntries',
    defs: {
      main: {
        type: 'query',
        description: 'List resource entries.',
        parameters: {
          type: 'params',
          required: ['repo'],
          properties: {
            repo: {
              type: 'string',
              format: 'at-identifier',
            },
            language: {
              type: 'string',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
            },
            cursor: {
              type: 'string',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['records'],
            properties: {
              cursor: {
                type: 'string',
              },
              records: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:pub.layers.resource.listEntries#recordView',
                },
              },
            },
          },
        },
      },
      recordView: {
        type: 'object',
        required: ['uri', 'cid', 'value'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          cid: {
            type: 'string',
            format: 'cid',
          },
          value: {
            type: 'ref',
            ref: 'lex:pub.layers.resource.entry#main',
          },
        },
      },
    },
  },
  PubLayersResourceListFillings: {
    lexicon: 1,
    id: 'pub.layers.resource.listFillings',
    defs: {
      main: {
        type: 'query',
        description: 'List template fillings.',
        parameters: {
          type: 'params',
          required: ['templateRef'],
          properties: {
            templateRef: {
              type: 'string',
              format: 'at-uri',
            },
            strategy: {
              type: 'string',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
            },
            cursor: {
              type: 'string',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['records'],
            properties: {
              cursor: {
                type: 'string',
              },
              records: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:pub.layers.resource.listFillings#recordView',
                },
              },
            },
          },
        },
      },
      recordView: {
        type: 'object',
        required: ['uri', 'cid', 'value'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          cid: {
            type: 'string',
            format: 'cid',
          },
          value: {
            type: 'ref',
            ref: 'lex:pub.layers.resource.filling#main',
          },
        },
      },
    },
  },
  PubLayersResourceListTemplateCompositions: {
    lexicon: 1,
    id: 'pub.layers.resource.listTemplateCompositions',
    defs: {
      main: {
        type: 'query',
        description: 'List template compositions.',
        parameters: {
          type: 'params',
          required: ['repo'],
          properties: {
            repo: {
              type: 'string',
              format: 'at-identifier',
            },
            compositionType: {
              type: 'string',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
            },
            cursor: {
              type: 'string',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['records'],
            properties: {
              cursor: {
                type: 'string',
              },
              records: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:pub.layers.resource.listTemplateCompositions#recordView',
                },
              },
            },
          },
        },
      },
      recordView: {
        type: 'object',
        required: ['uri', 'cid', 'value'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          cid: {
            type: 'string',
            format: 'cid',
          },
          value: {
            type: 'ref',
            ref: 'lex:pub.layers.resource.templateComposition#main',
          },
        },
      },
    },
  },
  PubLayersResourceListTemplates: {
    lexicon: 1,
    id: 'pub.layers.resource.listTemplates',
    defs: {
      main: {
        type: 'query',
        description: 'List resource templates.',
        parameters: {
          type: 'params',
          required: ['repo'],
          properties: {
            repo: {
              type: 'string',
              format: 'at-identifier',
            },
            language: {
              type: 'string',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
            },
            cursor: {
              type: 'string',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['records'],
            properties: {
              cursor: {
                type: 'string',
              },
              records: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:pub.layers.resource.listTemplates#recordView',
                },
              },
            },
          },
        },
      },
      recordView: {
        type: 'object',
        required: ['uri', 'cid', 'value'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          cid: {
            type: 'string',
            format: 'cid',
          },
          value: {
            type: 'ref',
            ref: 'lex:pub.layers.resource.template#main',
          },
        },
      },
    },
  },
  PubLayersResourceTemplate: {
    lexicon: 1,
    id: 'pub.layers.resource.template',
    defs: {
      main: {
        type: 'record',
        description:
          "A parameterized text template with named variable slots. Generalizes bead's Template (text pattern with {slotName} placeholders, slot definitions, and cross-slot constraints) and similar pattern structures used for stimulus generation, item construction, data augmentation, and controlled natural language. Templates are composable: they can reference ontologies, collections, and other templates.",
        key: 'tid',
        record: {
          type: 'object',
          required: ['text', 'slots', 'createdAt'],
          properties: {
            name: {
              type: 'string',
              description: 'Human-readable template name.',
              maxLength: 512,
            },
            text: {
              type: 'string',
              description:
                "Template text with {slotName} placeholders (e.g., '{subject} {verb} the {object}').",
              maxLength: 50000,
            },
            language: {
              type: 'string',
              description: 'BCP-47 language tag.',
              maxLength: 32,
            },
            slots: {
              type: 'array',
              description: 'The named slots in this template.',
              maxLength: 64,
              items: {
                type: 'ref',
                ref: 'lex:pub.layers.resource.defs#slot',
              },
            },
            constraints: {
              type: 'array',
              description:
                'Cross-slot constraints (e.g., agreement, semantic compatibility). These apply across multiple slots in this template.',
              maxLength: 64,
              items: {
                type: 'ref',
                ref: 'lex:pub.layers.defs#constraint',
              },
            },
            ontologyRef: {
              type: 'string',
              format: 'at-uri',
              description:
                'Reference to the ontology defining the type system used by this template.',
            },
            experimentRef: {
              type: 'string',
              format: 'at-uri',
              description:
                'Reference to the experiment this template was designed for.',
            },
            knowledgeRefs: {
              type: 'array',
              maxLength: 32,
              items: {
                type: 'ref',
                ref: 'lex:pub.layers.defs#knowledgeRef',
              },
            },
            metadata: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#annotationMetadata',
              description:
                'Provenance: who designed this template, with what tool.',
            },
            features: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#featureMap',
              description:
                'Open-ended features: measureType, taskType, category, domain, etc.',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
          },
        },
      },
    },
  },
  PubLayersResourceTemplateComposition: {
    lexicon: 1,
    id: 'pub.layers.resource.templateComposition',
    defs: {
      main: {
        type: 'record',
        description:
          'A composition of templates (sequence, tree, or other structure). Used for multi-part stimuli, template hierarchies, and complex item construction.',
        key: 'tid',
        record: {
          type: 'object',
          required: ['compositionType', 'members', 'createdAt'],
          properties: {
            compositionTypeUri: {
              type: 'string',
              format: 'at-uri',
              description:
                'AT-URI of the composition type definition node. Community-expandable via knowledge graph.',
            },
            compositionType: {
              type: 'string',
              description:
                'Composition type slug (fallback when compositionTypeUri unavailable).',
              knownValues: [
                'sequence',
                'tree',
                'parallel',
                'alternation',
                'custom',
              ],
              maxLength: 128,
            },
            members: {
              type: 'array',
              description: 'Ordered members of this composition.',
              maxLength: 256,
              items: {
                type: 'ref',
                ref: 'lex:pub.layers.resource.defs#templateMember',
              },
            },
            experimentRef: {
              type: 'string',
              format: 'at-uri',
              description:
                'Reference to the experiment this composition was designed for.',
            },
            metadata: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#annotationMetadata',
            },
            features: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#featureMap',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
          },
        },
      },
    },
  },
  PubLayersSegmentationDefs: {
    lexicon: 1,
    id: 'pub.layers.segmentation.defs',
    defs: {
      token: {
        type: 'object',
        description: 'A single token within a tokenization.',
        required: ['tokenIndex'],
        properties: {
          tokenIndex: {
            type: 'integer',
            description:
              'Position of this token in the tokenization (0-based).',
            minimum: 0,
          },
          text: {
            type: 'string',
            description: 'The surface form of the token.',
            maxLength: 4096,
          },
          textSpan: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#span',
            description: 'UTF-8 byte offsets into the expression text.',
          },
          temporalSpan: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#temporalSpan',
          },
        },
      },
      tokenization: {
        type: 'object',
        description:
          'An ordered sequence of tokens for an expression or sub-expression. Multiple tokenizations can coexist for the same expression (e.g., whitespace vs. BPE vs. morphological), enabling interlinear glossing, alternative segmentation strategies, or multi-granularity analysis.',
        required: ['uuid', 'kind', 'tokens'],
        properties: {
          uuid: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#uuid',
          },
          kindUri: {
            type: 'string',
            format: 'at-uri',
            description:
              'AT-URI of the tokenization kind definition node. Community-expandable via knowledge graph.',
          },
          kind: {
            type: 'string',
            description:
              'Tokenization kind slug (fallback when kindUri unavailable).',
            knownValues: [
              'whitespace',
              'penn-treebank',
              'bpe',
              'sentencepiece',
              'character',
              'morphological',
              'custom',
            ],
            maxLength: 128,
          },
          expressionRef: {
            type: 'string',
            format: 'at-uri',
            description:
              'Reference to the specific sub-expression this tokenization covers (e.g., a sentence-level expression). If absent, covers the entire expression referenced by the segmentation record.',
          },
          tokens: {
            type: 'array',
            description: 'The ordered token sequence.',
            items: {
              type: 'ref',
              ref: 'lex:pub.layers.segmentation.defs#token',
            },
          },
          metadata: {
            type: 'ref',
            ref: 'lex:pub.layers.defs#annotationMetadata',
          },
        },
      },
    },
  },
  PubLayersSegmentationGetSegmentation: {
    lexicon: 1,
    id: 'pub.layers.segmentation.getSegmentation',
    defs: {
      main: {
        type: 'query',
        description: 'Get a single segmentation by its AT-URI.',
        parameters: {
          type: 'params',
          required: ['uri'],
          properties: {
            uri: {
              type: 'string',
              format: 'at-uri',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['uri', 'cid', 'value'],
            properties: {
              uri: {
                type: 'string',
                format: 'at-uri',
              },
              cid: {
                type: 'string',
                format: 'cid',
              },
              value: {
                type: 'ref',
                ref: 'lex:pub.layers.segmentation.segmentation#main',
              },
            },
          },
        },
        errors: [
          {
            name: 'RecordNotFound',
          },
        ],
      },
    },
  },
  PubLayersSegmentationListSegmentations: {
    lexicon: 1,
    id: 'pub.layers.segmentation.listSegmentations',
    defs: {
      main: {
        type: 'query',
        description: 'List segmentations.',
        parameters: {
          type: 'params',
          required: ['expression'],
          properties: {
            expression: {
              type: 'string',
              format: 'at-uri',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
            },
            cursor: {
              type: 'string',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['records'],
            properties: {
              cursor: {
                type: 'string',
              },
              records: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:pub.layers.segmentation.listSegmentations#recordView',
                },
              },
            },
          },
        },
      },
      recordView: {
        type: 'object',
        required: ['uri', 'cid', 'value'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          cid: {
            type: 'string',
            format: 'cid',
          },
          value: {
            type: 'ref',
            ref: 'lex:pub.layers.segmentation.segmentation#main',
          },
        },
      },
    },
  },
  PubLayersSegmentationSegmentation: {
    lexicon: 1,
    id: 'pub.layers.segmentation.segmentation',
    description:
      'A segmentation record that binds one or more tokenizations to an expression. Each tokenization can cover the whole expression or a specific sub-expression (e.g., a sentence). Multiple segmentations can coexist for the same expression, enabling alternative tokenization strategies.',
    defs: {
      main: {
        type: 'record',
        description:
          'A segmentation of an expression into tokenizations. Structural hierarchy (sections, sentences, paragraphs) is expressed via expression records with parentRef; this record provides the token-level decomposition.',
        key: 'tid',
        record: {
          type: 'object',
          required: ['expression', 'tokenizations', 'createdAt'],
          properties: {
            expression: {
              type: 'string',
              format: 'at-uri',
              description:
                'Reference to the expression this segmentation applies to.',
            },
            tokenizations: {
              type: 'array',
              description:
                'The tokenizations in this segmentation. Each tokenization can optionally scope to a sub-expression via expressionRef.',
              items: {
                type: 'ref',
                ref: 'lex:pub.layers.segmentation.defs#tokenization',
              },
            },
            metadata: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#annotationMetadata',
            },
            knowledgeRefs: {
              type: 'array',
              description:
                'Knowledge graph references (e.g., tokenizer algorithm, sentence splitting model).',
              maxLength: 16,
              items: {
                type: 'ref',
                ref: 'lex:pub.layers.defs#knowledgeRef',
              },
            },
            features: {
              type: 'ref',
              ref: 'lex:pub.layers.defs#featureMap',
              description:
                'Open-ended features (e.g., tokenizer version, parameters, language model used).',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
          },
        },
      },
    },
  },
} as const satisfies Record<string, LexiconDoc>
export const schemas = Object.values(schemaDict) satisfies LexiconDoc[]
export const lexicons: Lexicons = new Lexicons(schemas)

export function validate<T extends { $type: string }>(
  v: unknown,
  id: string,
  hash: string,
  requiredType: true,
): ValidationResult<T>
export function validate<T extends { $type?: string }>(
  v: unknown,
  id: string,
  hash: string,
  requiredType?: false,
): ValidationResult<T>
export function validate(
  v: unknown,
  id: string,
  hash: string,
  requiredType?: boolean,
): ValidationResult {
  return (requiredType ? is$typed : maybe$typed)(v, id, hash)
    ? lexicons.validate(`${id}#${hash}`, v)
    : {
        success: false,
        error: new ValidationError(
          `Must be an object with "${hash === 'main' ? id : `${id}#${hash}`}" $type property`,
        ),
      }
}

export const ids = {
  ComAtprotoRepoApplyWrites: 'com.atproto.repo.applyWrites',
  ComAtprotoRepoCreateRecord: 'com.atproto.repo.createRecord',
  ComAtprotoRepoDefs: 'com.atproto.repo.defs',
  ComAtprotoRepoDeleteRecord: 'com.atproto.repo.deleteRecord',
  ComAtprotoRepoDescribeRepo: 'com.atproto.repo.describeRepo',
  ComAtprotoRepoGetRecord: 'com.atproto.repo.getRecord',
  ComAtprotoRepoImportRepo: 'com.atproto.repo.importRepo',
  ComAtprotoRepoListMissingBlobs: 'com.atproto.repo.listMissingBlobs',
  ComAtprotoRepoListRecords: 'com.atproto.repo.listRecords',
  ComAtprotoRepoPutRecord: 'com.atproto.repo.putRecord',
  ComAtprotoRepoStrongRef: 'com.atproto.repo.strongRef',
  ComAtprotoRepoUploadBlob: 'com.atproto.repo.uploadBlob',
  PubLayersAlignmentAlignment: 'pub.layers.alignment.alignment',
  PubLayersAlignmentGetAlignment: 'pub.layers.alignment.getAlignment',
  PubLayersAlignmentListAlignments: 'pub.layers.alignment.listAlignments',
  PubLayersAnnotationAnnotationLayer: 'pub.layers.annotation.annotationLayer',
  PubLayersAnnotationClusterSet: 'pub.layers.annotation.clusterSet',
  PubLayersAnnotationDefs: 'pub.layers.annotation.defs',
  PubLayersAnnotationGetAnnotationLayer:
    'pub.layers.annotation.getAnnotationLayer',
  PubLayersAnnotationGetClusterSet: 'pub.layers.annotation.getClusterSet',
  PubLayersAnnotationListAnnotationLayers:
    'pub.layers.annotation.listAnnotationLayers',
  PubLayersAnnotationListClusterSets: 'pub.layers.annotation.listClusterSets',
  PubLayersChangelogDefs: 'pub.layers.changelog.defs',
  PubLayersChangelogEntry: 'pub.layers.changelog.entry',
  PubLayersChangelogGetEntry: 'pub.layers.changelog.getEntry',
  PubLayersChangelogListByCollection: 'pub.layers.changelog.listByCollection',
  PubLayersChangelogListEntries: 'pub.layers.changelog.listEntries',
  PubLayersCorpusCorpus: 'pub.layers.corpus.corpus',
  PubLayersCorpusDefs: 'pub.layers.corpus.defs',
  PubLayersCorpusGetCorpus: 'pub.layers.corpus.getCorpus',
  PubLayersCorpusGetMembership: 'pub.layers.corpus.getMembership',
  PubLayersCorpusListCorpora: 'pub.layers.corpus.listCorpora',
  PubLayersCorpusListMemberships: 'pub.layers.corpus.listMemberships',
  PubLayersCorpusMembership: 'pub.layers.corpus.membership',
  PubLayersDefs: 'pub.layers.defs',
  PubLayersEprintDataLink: 'pub.layers.eprint.dataLink',
  PubLayersEprintDefs: 'pub.layers.eprint.defs',
  PubLayersEprintEprint: 'pub.layers.eprint.eprint',
  PubLayersEprintGetDataLink: 'pub.layers.eprint.getDataLink',
  PubLayersEprintGetEprint: 'pub.layers.eprint.getEprint',
  PubLayersEprintListDataLinks: 'pub.layers.eprint.listDataLinks',
  PubLayersEprintListEprints: 'pub.layers.eprint.listEprints',
  PubLayersExpressionExpression: 'pub.layers.expression.expression',
  PubLayersExpressionGetExpression: 'pub.layers.expression.getExpression',
  PubLayersExpressionListExpressions: 'pub.layers.expression.listExpressions',
  PubLayersGraphDefs: 'pub.layers.graph.defs',
  PubLayersGraphGetGraphEdge: 'pub.layers.graph.getGraphEdge',
  PubLayersGraphGetGraphEdgeSet: 'pub.layers.graph.getGraphEdgeSet',
  PubLayersGraphGetGraphNode: 'pub.layers.graph.getGraphNode',
  PubLayersGraphGraphEdge: 'pub.layers.graph.graphEdge',
  PubLayersGraphGraphEdgeSet: 'pub.layers.graph.graphEdgeSet',
  PubLayersGraphGraphNode: 'pub.layers.graph.graphNode',
  PubLayersGraphListGraphEdgeSets: 'pub.layers.graph.listGraphEdgeSets',
  PubLayersGraphListGraphEdges: 'pub.layers.graph.listGraphEdges',
  PubLayersGraphListGraphNodes: 'pub.layers.graph.listGraphNodes',
  PubLayersJudgmentAgreementReport: 'pub.layers.judgment.agreementReport',
  PubLayersJudgmentDefs: 'pub.layers.judgment.defs',
  PubLayersJudgmentExperimentDef: 'pub.layers.judgment.experimentDef',
  PubLayersJudgmentGetAgreementReport: 'pub.layers.judgment.getAgreementReport',
  PubLayersJudgmentGetExperimentDef: 'pub.layers.judgment.getExperimentDef',
  PubLayersJudgmentGetJudgmentSet: 'pub.layers.judgment.getJudgmentSet',
  PubLayersJudgmentJudgmentSet: 'pub.layers.judgment.judgmentSet',
  PubLayersJudgmentListAgreementReports:
    'pub.layers.judgment.listAgreementReports',
  PubLayersJudgmentListExperimentDefs: 'pub.layers.judgment.listExperimentDefs',
  PubLayersJudgmentListJudgmentSets: 'pub.layers.judgment.listJudgmentSets',
  PubLayersMediaDefs: 'pub.layers.media.defs',
  PubLayersMediaGetMedia: 'pub.layers.media.getMedia',
  PubLayersMediaListMedia: 'pub.layers.media.listMedia',
  PubLayersMediaMedia: 'pub.layers.media.media',
  PubLayersOntologyDefs: 'pub.layers.ontology.defs',
  PubLayersOntologyGetOntology: 'pub.layers.ontology.getOntology',
  PubLayersOntologyGetTypeDef: 'pub.layers.ontology.getTypeDef',
  PubLayersOntologyListOntologies: 'pub.layers.ontology.listOntologies',
  PubLayersOntologyListTypeDefs: 'pub.layers.ontology.listTypeDefs',
  PubLayersOntologyOntology: 'pub.layers.ontology.ontology',
  PubLayersOntologyTypeDef: 'pub.layers.ontology.typeDef',
  PubLayersPersonaGetPersona: 'pub.layers.persona.getPersona',
  PubLayersPersonaListPersonas: 'pub.layers.persona.listPersonas',
  PubLayersPersonaPersona: 'pub.layers.persona.persona',
  PubLayersResourceCollection: 'pub.layers.resource.collection',
  PubLayersResourceCollectionMembership:
    'pub.layers.resource.collectionMembership',
  PubLayersResourceDefs: 'pub.layers.resource.defs',
  PubLayersResourceEntry: 'pub.layers.resource.entry',
  PubLayersResourceFilling: 'pub.layers.resource.filling',
  PubLayersResourceGetCollection: 'pub.layers.resource.getCollection',
  PubLayersResourceGetCollectionMembership:
    'pub.layers.resource.getCollectionMembership',
  PubLayersResourceGetEntry: 'pub.layers.resource.getEntry',
  PubLayersResourceGetFilling: 'pub.layers.resource.getFilling',
  PubLayersResourceGetTemplate: 'pub.layers.resource.getTemplate',
  PubLayersResourceGetTemplateComposition:
    'pub.layers.resource.getTemplateComposition',
  PubLayersResourceListCollectionMemberships:
    'pub.layers.resource.listCollectionMemberships',
  PubLayersResourceListCollections: 'pub.layers.resource.listCollections',
  PubLayersResourceListEntries: 'pub.layers.resource.listEntries',
  PubLayersResourceListFillings: 'pub.layers.resource.listFillings',
  PubLayersResourceListTemplateCompositions:
    'pub.layers.resource.listTemplateCompositions',
  PubLayersResourceListTemplates: 'pub.layers.resource.listTemplates',
  PubLayersResourceTemplate: 'pub.layers.resource.template',
  PubLayersResourceTemplateComposition:
    'pub.layers.resource.templateComposition',
  PubLayersSegmentationDefs: 'pub.layers.segmentation.defs',
  PubLayersSegmentationGetSegmentation:
    'pub.layers.segmentation.getSegmentation',
  PubLayersSegmentationListSegmentations:
    'pub.layers.segmentation.listSegmentations',
  PubLayersSegmentationSegmentation: 'pub.layers.segmentation.segmentation',
} as const
