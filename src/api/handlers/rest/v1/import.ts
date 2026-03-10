/**
 * REST import endpoints for parsing annotation files via format importer plugins.
 *
 * Provides endpoints to list available formats, validate files, and execute
 * format imports. The import endpoint parses files into structured Layers
 * records but does NOT write to user PDSes; that is the frontend's
 * responsibility via ATProto agent.
 *
 * @module
 */

import type { Context, Hono } from 'hono';

import type { ImportFormat } from '../../../../types/interfaces/plugin.interface.js';
import type { PluginRegistry } from '../../../../plugins/plugin-registry.js';

/**
 * Describes a supported import format returned by the formats endpoint.
 */
interface FormatInfo {
  readonly id: ImportFormat;
  readonly name: string;
  readonly extensions: string[];
  readonly description: string;
}

/**
 * Mapping from user-facing format labels to canonical ImportFormat values.
 */
const FORMAT_ALIASES: Record<string, ImportFormat> = {
  conll: 'conll',
  'conll-u': 'conll',
  brat: 'brat',
  elan: 'elan',
  tei: 'tei',
  'tei xml': 'tei',
  praat: 'praat',
  'praat textgrid': 'praat',
};

/**
 * Static list of supported import formats with metadata.
 */
const SUPPORTED_FORMATS: readonly FormatInfo[] = [
  {
    id: 'conll',
    name: 'CoNLL-U',
    extensions: ['.conllu', '.conll'],
    description: 'CoNLL-U format for morphological and syntactic annotations',
  },
  {
    id: 'brat',
    name: 'BRAT',
    extensions: ['.ann', '.txt'],
    description: 'BRAT standoff annotation format for entities, relations, and events',
  },
  {
    id: 'elan',
    name: 'ELAN',
    extensions: ['.eaf'],
    description: 'ELAN annotation format for time-aligned multimedia annotations',
  },
  {
    id: 'tei',
    name: 'TEI XML',
    extensions: ['.xml', '.tei'],
    description: 'TEI XML format for text encoding and inline annotations',
  },
  {
    id: 'praat',
    name: 'Praat TextGrid',
    extensions: ['.TextGrid'],
    description: 'Praat TextGrid format for phonetic interval and point annotations',
  },
];

/**
 * Normalizes a user-supplied format string to a canonical ImportFormat value.
 *
 * Accepts both canonical lowercase identifiers (e.g., "conll") and
 * display-style names (e.g., "CoNLL-U", "TEI XML", "Praat TextGrid").
 *
 * @param input - the raw format string from the request
 * @returns the canonical ImportFormat, or undefined if unrecognized
 */
function normalizeFormat(input: string): ImportFormat | undefined {
  const key = input.toLowerCase().trim();
  return FORMAT_ALIASES[key];
}

/**
 * Shape of a field mapping entry provided in the import request.
 */
interface FieldMapping {
  readonly sourceField: string;
  readonly targetField: string;
  readonly transform?: string;
}

/**
 * Parses the mappings JSON string from the request body.
 *
 * @param raw - the raw JSON string, or undefined
 * @returns parsed array of field mappings, or an empty array
 */
function parseMappings(raw: string | undefined): FieldMapping[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as FieldMapping[];
  } catch {
    return [];
  }
}

/**
 * Registers import-related REST routes on the given Hono app.
 *
 * @param app - the Hono application instance
 * @param pluginRegistry - the plugin registry containing format importers
 */
function importRoutes(app: Hono, pluginRegistry: PluginRegistry): void {
  /**
   * GET /api/v1/import/formats
   *
   * Lists all supported import formats with their file extensions.
   * No authentication required.
   */
  app.get('/api/v1/import/formats', (c: Context) => {
    return c.json({ formats: SUPPORTED_FORMATS });
  });

  /**
   * POST /api/v1/import/validate
   *
   * Validates a file against its format without executing a full import.
   * Authentication is optional.
   */
  app.post('/api/v1/import/validate', async (c: Context) => {
    const body = await c.req.parseBody();

    const file = body.file;
    const formatRaw = body.format;

    if (!file || !(file instanceof File)) {
      return c.json({ valid: false, errors: ['No file provided'] }, 400);
    }

    if (typeof formatRaw !== 'string' || !formatRaw) {
      return c.json({ valid: false, errors: ['Format is required'] }, 400);
    }

    const format = normalizeFormat(formatRaw);
    if (!format) {
      return c.json({ valid: false, errors: [`Unsupported format: ${formatRaw}`] }, 400);
    }

    const importer = pluginRegistry.getImporter(format);
    if (!importer) {
      return c.json(
        { valid: false, errors: [`No importer registered for format: ${format}`] },
        400,
      );
    }

    const content = await file.text();
    const validationResult = importer.validate(content);

    if (!validationResult.ok) {
      return c.json({
        valid: false,
        errors: [validationResult.error.message],
      });
    }

    // Run a parse to generate preview counts
    const parseResult = await importer.parse(content);

    if (!parseResult.ok) {
      return c.json({
        valid: true,
        preview: { expressions: 0, segmentations: 0, layers: 0 },
      });
    }

    return c.json({
      valid: true,
      preview: {
        expressions: parseResult.value.expressions.length,
        segmentations: parseResult.value.segmentations.length,
        layers: parseResult.value.annotationLayers.length,
      },
    });
  });

  /**
   * POST /api/v1/import
   *
   * Executes a format import: validates the file, parses it, and returns
   * structured record data. Requires authentication.
   */
  app.post('/api/v1/import', async (c: Context) => {
    // Check authentication via the auth context set by middleware
    const auth = c.get('auth') as { did: string | null; authenticated: boolean } | undefined;
    if (!auth?.authenticated) {
      return c.json({ error: 'AUTHENTICATION_ERROR', message: 'Authentication required' }, 401);
    }

    const body = await c.req.parseBody();

    const file = body.file;
    const formatRaw = body.format;
    const mappingsRaw = body.mappings;

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'VALIDATION_ERROR', message: 'No file provided' }, 400);
    }

    if (typeof formatRaw !== 'string' || !formatRaw) {
      return c.json({ error: 'VALIDATION_ERROR', message: 'Format is required' }, 400);
    }

    const format = normalizeFormat(formatRaw);
    if (!format) {
      return c.json(
        { error: 'VALIDATION_ERROR', message: `Unsupported format: ${formatRaw}` },
        400,
      );
    }

    const importer = pluginRegistry.getImporter(format);
    if (!importer) {
      return c.json(
        { error: 'VALIDATION_ERROR', message: `No importer registered for format: ${format}` },
        400,
      );
    }

    const content = await file.text();

    // Validate first
    const validationResult = importer.validate(content);
    if (!validationResult.ok) {
      return c.json(
        {
          error: 'VALIDATION_ERROR',
          message: `File validation failed: ${validationResult.error.message}`,
        },
        400,
      );
    }

    // Parse with mappings
    const mappings = parseMappings(typeof mappingsRaw === 'string' ? mappingsRaw : undefined);
    const parseResult = await importer.parse(content, { mappings });

    if (!parseResult.ok) {
      return c.json(
        {
          error: 'PLUGIN_ERROR',
          message: `Import failed: ${parseResult.error.message}`,
        },
        500,
      );
    }

    const result = parseResult.value;

    return c.json({
      success: true,
      counts: {
        expressions: result.expressions.length,
        segmentations: result.segmentations.length,
        layers: result.annotationLayers.length,
      },
      format,
      metadata: result.metadata,
    });
  });
}

export { importRoutes, normalizeFormat, SUPPORTED_FORMATS };
export type { FieldMapping, FormatInfo };
