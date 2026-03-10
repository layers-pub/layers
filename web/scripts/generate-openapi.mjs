#!/usr/bin/env node

/**
 * Generates an OpenAPI 3.1.0 spec from Layers lexicon JSON files.
 *
 * Reads all lexicon files from the lexicons directory, converts record types
 * and query endpoints into OpenAPI schemas and paths, and writes the result
 * to lib/api/openapi.json.
 */

import { readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const LEXICONS_DIR = resolve(import.meta.dirname, '../../lexicons/pub/layers');
const OUTPUT_FILE = resolve(import.meta.dirname, '../lib/api/openapi.json');

// ---------------------------------------------------------------------------
// 1. Load all lexicon files
// ---------------------------------------------------------------------------

/** @type {Map<string, object>} id -> lexicon */
const lexiconMap = new Map();

function collectJsonFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJsonFiles(fullPath));
    } else if (entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }
  return files;
}

const jsonFiles = collectJsonFiles(LEXICONS_DIR);
for (const filePath of jsonFiles) {
  const content = JSON.parse(readFileSync(filePath, 'utf-8'));
  if (content.id) {
    lexiconMap.set(content.id, content);
  }
}

console.log(`Loaded ${lexiconMap.size} lexicon files.`);

// ---------------------------------------------------------------------------
// 2. Schema naming
// ---------------------------------------------------------------------------

/**
 * Convert a lexicon ref to an OpenAPI schema name.
 *
 * Examples:
 *   "pub.layers.defs#span" -> "DefsSpan"
 *   "pub.layers.annotation.defs#annotation" -> "AnnotationDefsAnnotation"
 *   "pub.layers.expression.expression#main" -> "ExpressionExpressionMain"
 */
function refToSchemaName(ref) {
  // ref can be "pub.layers.X.Y#defName" or "pub.layers.X.Y" (implied #main)
  let fileId;
  let defName;

  if (ref.includes('#')) {
    const [fid, dn] = ref.split('#');
    fileId = fid;
    defName = dn;
  } else {
    fileId = ref;
    defName = 'main';
  }

  // Strip "pub.layers." prefix
  const stripped = fileId.replace(/^pub\.layers\./, '');
  // Split on dots, combine with defName
  const parts = [...stripped.split('.'), defName];
  // PascalCase each part
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('');
}

/**
 * Schema name for a query output.
 * "pub.layers.expression.getExpression" -> "ExpressionGetExpressionOutput"
 */
function queryOutputSchemaName(lexiconId) {
  const stripped = lexiconId.replace(/^pub\.layers\./, '');
  const parts = stripped.split('.');
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('') + 'Output';
}

/**
 * Schema name for a query's named def (e.g., recordView).
 * ("pub.layers.expression.listExpressions", "recordView") -> "ExpressionListExpressionsRecordView"
 */
function queryDefSchemaName(lexiconId, defName) {
  const stripped = lexiconId.replace(/^pub\.layers\./, '');
  const parts = [...stripped.split('.'), defName];
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('');
}

/**
 * Schema name for a record type's main def.
 * "pub.layers.expression.expression" -> "ExpressionExpressionRecord"
 */
function recordSchemaName(lexiconId) {
  const stripped = lexiconId.replace(/^pub\.layers\./, '');
  const parts = stripped.split('.');
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('') + 'Record';
}

// ---------------------------------------------------------------------------
// 3. Lexicon type -> OpenAPI schema conversion
// ---------------------------------------------------------------------------

/** @type {Record<string, object>} collected schemas */
const schemas = {};

/**
 * Convert a lexicon format string to OpenAPI format.
 */
function convertFormat(format) {
  switch (format) {
    case 'at-uri':
      return 'uri';
    case 'did':
      return undefined; // just use type: string
    case 'cid':
      return undefined; // just use type: string
    case 'datetime':
      return 'date-time';
    case 'at-identifier':
      return undefined; // just use type: string
    case 'uri':
      return 'uri';
    default:
      return format;
  }
}

/**
 * Resolve a ref string to the referenced def object.
 * @param {string} ref - e.g., "#span", "pub.layers.defs#span"
 * @param {string} currentFileId - the lexicon ID of the file containing the ref
 * @returns {{ fileId: string, defName: string, def: object } | null}
 */
function resolveRef(ref, currentFileId) {
  let fileId;
  let defName;

  if (ref.startsWith('#')) {
    fileId = currentFileId;
    defName = ref.slice(1);
  } else if (ref.includes('#')) {
    const [fid, dn] = ref.split('#');
    fileId = fid;
    defName = dn;
  } else {
    fileId = ref;
    defName = 'main';
  }

  const lexicon = lexiconMap.get(fileId);
  if (!lexicon) return null;
  const def = lexicon.defs?.[defName];
  if (!def) return null;
  return { fileId, defName, def };
}

/**
 * Convert a lexicon property/type definition to an OpenAPI schema object.
 * @param {object} prop - the lexicon property definition
 * @param {string} currentFileId - the lexicon file ID for resolving local refs
 * @returns {object} OpenAPI schema
 */
function convertType(prop, currentFileId) {
  if (!prop) return {};

  const schema = {};

  if (prop.description) {
    schema.description = prop.description;
  }

  switch (prop.type) {
    case 'string': {
      schema.type = 'string';
      if (prop.format) {
        const fmt = convertFormat(prop.format);
        if (fmt) schema.format = fmt;
      }
      if (prop.knownValues) {
        schema.enum = prop.knownValues;
      }
      if (prop.maxLength !== undefined) schema.maxLength = prop.maxLength;
      if (prop.minLength !== undefined) schema.minLength = prop.minLength;
      break;
    }

    case 'integer': {
      schema.type = 'integer';
      if (prop.minimum !== undefined) schema.minimum = prop.minimum;
      if (prop.maximum !== undefined) schema.maximum = prop.maximum;
      if (prop.default !== undefined) schema.default = prop.default;
      break;
    }

    case 'boolean': {
      schema.type = 'boolean';
      break;
    }

    case 'array': {
      schema.type = 'array';
      if (prop.items) {
        schema.items = convertType(prop.items, currentFileId);
      }
      if (prop.maxLength !== undefined) schema.maxItems = prop.maxLength;
      break;
    }

    case 'object': {
      schema.type = 'object';
      if (prop.properties) {
        schema.properties = {};
        for (const [key, val] of Object.entries(prop.properties)) {
          schema.properties[key] = convertType(val, currentFileId);
        }
      }
      if (prop.required && prop.required.length > 0) {
        schema.required = [...prop.required];
      }
      break;
    }

    case 'ref': {
      if (prop.ref) {
        // Ensure the referenced schema gets generated
        ensureSchema(prop.ref, currentFileId);
        const schemaName = resolveSchemaName(prop.ref, currentFileId);
        return {
          $ref: `#/components/schemas/${schemaName}`,
          ...(prop.description ? { description: prop.description } : {}),
        };
      }
      break;
    }

    case 'union': {
      if (prop.refs && prop.refs.length > 0) {
        schema.oneOf = prop.refs.map((r) => {
          ensureSchema(r, currentFileId);
          const schemaName = resolveSchemaName(r, currentFileId);
          return { $ref: `#/components/schemas/${schemaName}` };
        });
      }
      break;
    }

    case 'blob': {
      schema.type = 'object';
      schema.description = prop.description || 'Blob reference.';
      schema.properties = {
        $type: { type: 'string' },
        ref: {
          type: 'object',
          properties: {
            $link: { type: 'string' },
          },
        },
        mimeType: { type: 'string' },
        size: { type: 'integer' },
      };
      break;
    }

    case 'unknown': {
      // No constraints
      break;
    }

    case 'params': {
      // params is a container for query parameters; treat like object
      schema.type = 'object';
      if (prop.properties) {
        schema.properties = {};
        for (const [key, val] of Object.entries(prop.properties)) {
          schema.properties[key] = convertType(val, currentFileId);
        }
      }
      if (prop.required && prop.required.length > 0) {
        schema.required = [...prop.required];
      }
      break;
    }

    default:
      // Unknown type, return empty schema
      break;
  }

  return schema;
}

/**
 * Resolve a ref to its OpenAPI schema name, normalizing local refs.
 */
function resolveSchemaName(ref, currentFileId) {
  if (ref.startsWith('#')) {
    // Local ref: expand to full form
    return refToSchemaName(`${currentFileId}#${ref.slice(1)}`);
  }
  return refToSchemaName(ref);
}

/**
 * Track which schemas have been generated to avoid infinite recursion.
 * @type {Set<string>}
 */
const generatedSchemas = new Set();

/**
 * Ensure a schema exists in the output for the given ref.
 */
function ensureSchema(ref, currentFileId) {
  // Normalize the ref
  let fullRef;
  if (ref.startsWith('#')) {
    fullRef = `${currentFileId}#${ref.slice(1)}`;
  } else {
    fullRef = ref;
  }

  const schemaName = refToSchemaName(fullRef);
  if (generatedSchemas.has(schemaName)) return;
  generatedSchemas.add(schemaName);

  const resolved = resolveRef(ref, currentFileId);
  if (!resolved) {
    console.warn(`  Warning: Could not resolve ref "${ref}" from "${currentFileId}"`);
    schemas[schemaName] = { type: 'object', description: `Unresolved ref: ${fullRef}` };
    return;
  }

  const { fileId, defName, def } = resolved;

  // If the def is a record type, convert its .record
  if (def.type === 'record' && def.record) {
    schemas[schemaName] = convertType(def.record, fileId);
    if (def.description && !schemas[schemaName].description) {
      schemas[schemaName].description = def.description;
    }
  } else {
    schemas[schemaName] = convertType(def, fileId);
  }
}

// ---------------------------------------------------------------------------
// 4. Process all defs into component schemas
// ---------------------------------------------------------------------------

// First pass: generate schemas for all named defs (non-query, non-record main defs
// are shared definitions that may be referenced)
for (const [id, lexicon] of lexiconMap) {
  if (!lexicon.defs) continue;

  for (const [defName, def] of Object.entries(lexicon.defs)) {
    if (defName === 'main' && def.type === 'query') continue; // handled as paths
    if (defName === 'main' && def.type === 'record') {
      // Generate a Record schema
      const schemaName = recordSchemaName(id);
      if (!generatedSchemas.has(schemaName)) {
        generatedSchemas.add(schemaName);
        if (def.record) {
          schemas[schemaName] = convertType(def.record, id);
          if (def.description && !schemas[schemaName].description) {
            schemas[schemaName].description = def.description;
          }
        }
      }
      // Also generate with the ref-based name (ExpressionExpressionMain) so refs resolve
      const refName = refToSchemaName(`${id}#main`);
      if (!generatedSchemas.has(refName)) {
        generatedSchemas.add(refName);
        schemas[refName] = { $ref: `#/components/schemas/${schemaName}` };
      }
      continue;
    }

    // Named def (shared definition or query sub-def)
    const fullRef = `${id}#${defName}`;
    const schemaName = refToSchemaName(fullRef);
    if (!generatedSchemas.has(schemaName)) {
      generatedSchemas.add(schemaName);
      schemas[schemaName] = convertType(def, id);
    }
  }
}

// ---------------------------------------------------------------------------
// 5. Process all queries into OpenAPI paths
// ---------------------------------------------------------------------------

/** @type {Record<string, object>} */
const paths = {};

for (const [id, lexicon] of lexiconMap) {
  const mainDef = lexicon.defs?.main;
  if (!mainDef || mainDef.type !== 'query') continue;

  const path = `/xrpc/${id}`;
  const operation = {
    operationId: id,
    summary: mainDef.description || `Query: ${id}`,
    tags: [id.split('.').slice(2, -1).join('.')],
    parameters: [],
    responses: {},
  };

  // Parameters
  if (mainDef.parameters && mainDef.parameters.properties) {
    const requiredParams = new Set(mainDef.parameters.required || []);
    const sortedParamKeys = Object.keys(mainDef.parameters.properties).sort();

    for (const paramName of sortedParamKeys) {
      const paramDef = mainDef.parameters.properties[paramName];
      const param = {
        name: paramName,
        in: 'query',
        required: requiredParams.has(paramName),
        schema: convertType(paramDef, id),
      };
      if (paramDef.description) {
        param.description = paramDef.description;
      }
      operation.parameters.push(param);
    }
  }

  // Output
  if (mainDef.output && mainDef.output.schema) {
    const outputSchemaName = queryOutputSchemaName(id);
    if (!generatedSchemas.has(outputSchemaName)) {
      generatedSchemas.add(outputSchemaName);
      schemas[outputSchemaName] = convertType(mainDef.output.schema, id);
    }

    operation.responses['200'] = {
      description: 'Success',
      content: {
        'application/json': {
          schema: { $ref: `#/components/schemas/${outputSchemaName}` },
        },
      },
    };
  }

  // Errors
  if (mainDef.errors && mainDef.errors.length > 0) {
    operation.responses['400'] = {
      description: 'Bad request',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/XRPCError' },
        },
      },
    };
  }

  paths[path] = { get: operation };
}

// ---------------------------------------------------------------------------
// 6. Add REST admin endpoints
// ---------------------------------------------------------------------------

// REST schema definitions
schemas['DLQEntry'] = {
  type: 'object',
  required: ['id', 'uri', 'error', 'failureCount', 'firstFailedAt', 'lastFailedAt'],
  properties: {
    id: { type: 'string' },
    uri: { type: 'string' },
    error: { type: 'string' },
    failureCount: { type: 'integer' },
    firstFailedAt: { type: 'string', format: 'date-time' },
    lastFailedAt: { type: 'string', format: 'date-time' },
  },
};

schemas['ReconciliationStatus'] = {
  type: 'object',
  required: ['table', 'pgCount', 'esCount', 'neo4jCount', 'mismatches'],
  properties: {
    table: { type: 'string' },
    pgCount: { type: 'integer' },
    esCount: { type: 'integer' },
    neo4jCount: { type: 'integer' },
    mismatches: { type: 'integer' },
  },
};

schemas['SystemHealth'] = {
  type: 'object',
  required: ['apiUptime', 'indexerLag', 'pgPoolActive', 'pgPoolIdle', 'memoryUsageMb'],
  properties: {
    apiUptime: { type: 'number' },
    indexerLag: { type: 'number' },
    pgPoolActive: { type: 'integer' },
    pgPoolIdle: { type: 'integer' },
    memoryUsageMb: { type: 'number' },
  },
};

schemas['QueueDepth'] = {
  type: 'object',
  required: ['name', 'waiting', 'active', 'completed', 'failed'],
  properties: {
    name: { type: 'string' },
    waiting: { type: 'integer' },
    active: { type: 'integer' },
    completed: { type: 'integer' },
    failed: { type: 'integer' },
  },
};

schemas['CrossReference'] = {
  type: 'object',
  required: ['uri', 'sourceUri', 'targetUri', 'refType', 'createdAt'],
  properties: {
    uri: { type: 'string' },
    sourceUri: { type: 'string' },
    targetUri: { type: 'string' },
    refType: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

schemas['SearchResult'] = {
  type: 'object',
  required: ['uri', 'collection', 'did', 'score', 'highlights', 'record'],
  properties: {
    uri: { type: 'string' },
    collection: { type: 'string' },
    did: { type: 'string' },
    score: { type: 'number' },
    highlights: {
      type: 'object',
      additionalProperties: {
        type: 'array',
        items: { type: 'string' },
      },
    },
    record: { type: 'object' },
  },
};

schemas['XRPCError'] = {
  type: 'object',
  required: ['error', 'message'],
  properties: {
    error: { type: 'string' },
    message: { type: 'string' },
  },
};

schemas['SuccessResponse'] = {
  type: 'object',
  required: ['success'],
  properties: {
    success: { type: 'boolean' },
  },
};

// DLQ list
paths['/api/v1/admin/dlq'] = {
  get: {
    operationId: 'adminListDLQ',
    summary: 'List DLQ entries.',
    tags: ['admin'],
    parameters: [
      { name: 'cursor', in: 'query', required: false, schema: { type: 'string' } },
      { name: 'limit', in: 'query', required: false, schema: { type: 'integer' } },
      { name: 'collection', in: 'query', required: false, schema: { type: 'string' } },
    ],
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['entries', 'total'],
              properties: {
                entries: { type: 'array', items: { $ref: '#/components/schemas/DLQEntry' } },
                total: { type: 'integer' },
                cursor: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
};

// DLQ replay
paths['/api/v1/admin/dlq/{id}/replay'] = {
  post: {
    operationId: 'adminReplayDLQ',
    summary: 'Retry a DLQ entry.',
    tags: ['admin'],
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/SuccessResponse' },
          },
        },
      },
    },
  },
};

// DLQ dismiss
paths['/api/v1/admin/dlq/{id}'] = {
  delete: {
    operationId: 'adminDismissDLQ',
    summary: 'Dismiss a DLQ entry.',
    tags: ['admin'],
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/SuccessResponse' },
          },
        },
      },
    },
  },
};

// Reconciliation status
paths['/api/v1/admin/reconciliation'] = {
  get: {
    operationId: 'adminGetReconciliationStatus',
    summary: 'Get reconciliation status.',
    tags: ['admin'],
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: { $ref: '#/components/schemas/ReconciliationStatus' },
            },
          },
        },
      },
    },
  },
};

// Reconciliation run
paths['/api/v1/admin/reconciliation/run'] = {
  post: {
    operationId: 'adminRunReconciliation',
    summary: 'Trigger reconciliation.',
    tags: ['admin'],
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/SuccessResponse' },
          },
        },
      },
    },
  },
};

// System health
paths['/api/v1/admin/health'] = {
  get: {
    operationId: 'adminGetHealth',
    summary: 'Get system health.',
    tags: ['admin'],
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/SystemHealth' },
          },
        },
      },
    },
  },
};

// Queue depths
paths['/api/v1/admin/queues'] = {
  get: {
    operationId: 'adminGetQueues',
    summary: 'Get queue depths.',
    tags: ['admin'],
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: { $ref: '#/components/schemas/QueueDepth' },
            },
          },
        },
      },
    },
  },
};

// Cross-references
paths['/api/v1/references'] = {
  get: {
    operationId: 'getReferences',
    summary: 'Get cross-references.',
    tags: ['references'],
    parameters: [{ name: 'target', in: 'query', required: true, schema: { type: 'string' } }],
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['references'],
              properties: {
                references: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/CrossReference' },
                },
                cursor: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
};

// Import
paths['/api/v1/import'] = {
  post: {
    operationId: 'importFile',
    summary: 'Import a file.',
    tags: ['import'],
    requestBody: {
      required: true,
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            required: ['file', 'format'],
            properties: {
              file: { type: 'string', format: 'binary' },
              format: { type: 'string' },
              mappings: { type: 'string' },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['jobId'],
              properties: {
                jobId: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
};

// Search
paths['/api/v1/search'] = {
  get: {
    operationId: 'search',
    summary: 'Full-text search.',
    tags: ['search'],
    parameters: [
      { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
      { name: 'type', in: 'query', required: false, schema: { type: 'string' } },
      { name: 'limit', in: 'query', required: false, schema: { type: 'integer' } },
      { name: 'cursor', in: 'query', required: false, schema: { type: 'string' } },
    ],
    responses: {
      200: {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['results', 'total'],
              properties: {
                results: { type: 'array', items: { $ref: '#/components/schemas/SearchResult' } },
                total: { type: 'integer' },
                cursor: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
};

// ---------------------------------------------------------------------------
// 7. Assemble and write the output
// ---------------------------------------------------------------------------

// Sort schemas by key for deterministic output
const sortedSchemas = {};
for (const key of Object.keys(schemas).sort()) {
  sortedSchemas[key] = schemas[key];
}

// Sort paths by key for deterministic output
const sortedPaths = {};
for (const key of Object.keys(paths).sort()) {
  sortedPaths[key] = paths[key];
}

const spec = {
  openapi: '3.1.0',
  info: {
    title: 'Layers AppView API',
    description:
      'Decentralized linguistic annotation service built on AT Protocol. ' +
      'Provides XRPC query endpoints for 26 pub.layers.* record types and ' +
      'REST endpoints for search, cross-references, composite views, and administration.',
    version: '0.1.0',
    license: {
      name: 'MIT',
    },
  },
  servers: [
    {
      url: 'http://127.0.0.1:3001',
      description: 'Local development',
    },
    {
      url: 'https://appview.layers.pub',
      description: 'Production',
    },
  ],
  paths: sortedPaths,
  components: {
    schemas: sortedSchemas,
  },
};

writeFileSync(OUTPUT_FILE, JSON.stringify(spec, null, 2) + '\n', 'utf-8');

const pathCount = Object.keys(sortedPaths).length;
const schemaCount = Object.keys(sortedSchemas).length;
console.log(`Generated OpenAPI spec: ${pathCount} paths, ${schemaCount} schemas.`);
console.log(`Written to: ${OUTPUT_FILE}`);
