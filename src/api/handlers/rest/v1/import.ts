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

import type { OpticKind } from '@panproto/core';

import type { ImportFormat } from '../../../../types/interfaces/plugin.interface.js';
import type { IPanprotoService } from '../../../../types/interfaces/panproto.interface.js';
import type { PluginRegistry } from '../../../../plugins/plugin-registry.js';
import {
  ALL_FORMATS,
  getProtocolMeta,
  type ProtocolMeta,
} from '../../../../services/panproto/protocol-registry.js';

/**
 * Describes a supported import format returned by the formats endpoint.
 */
interface FormatInfo {
  readonly id: ImportFormat;
  readonly name: string;
  readonly extensions: readonly string[];
  readonly description: string;
}

/**
 * Build a format alias map from the protocol registry.
 *
 * Maps various user-facing labels to canonical ImportFormat values:
 * the format key itself, the panproto protocol ID (snake_case), and
 * the human-readable display name (lowercased).
 */
function buildAliasMap(): Record<string, ImportFormat> {
  const aliases: Record<string, ImportFormat> = {};
  for (const meta of ALL_FORMATS) {
    aliases[meta.format] = meta.format;
    aliases[meta.protocol] = meta.format;
    aliases[meta.name.toLowerCase()] = meta.format;
  }
  // Legacy aliases
  aliases['conll'] = 'conllu';
  aliases['conll-u'] = 'conllu';
  aliases['tei xml'] = 'tei';
  aliases['praat textgrid'] = 'praat';
  return aliases;
}

const FORMAT_ALIASES: Record<string, ImportFormat> = buildAliasMap();

/**
 * Derive the supported formats list from the protocol registry.
 */
const SUPPORTED_FORMATS: readonly FormatInfo[] = ALL_FORMATS.map(
  (meta: ProtocolMeta): FormatInfo => ({
    id: meta.format,
    name: meta.name,
    extensions: meta.extensions,
    description: `${meta.name} annotation format`,
  }),
);

/**
 * Normalizes a user-supplied format string to a canonical ImportFormat value.
 *
 * Accepts canonical identifiers, panproto protocol IDs, and display-style
 * names (case-insensitive).
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
 * Response shape for the dry-run endpoint.
 */
interface DryRunResponse {
  readonly coverageRatio: number;
  readonly opticKind: OpticKind | null;
  readonly preview: {
    readonly expressions: number;
    readonly segmentations: number;
    readonly layers: number;
  };
  readonly metadata?: Record<string, unknown> | undefined;
}

/**
 * Registers import-related REST routes on the given Hono app.
 *
 * @param app - the Hono application instance
 * @param pluginRegistry - the plugin registry containing format importers
 * @param panprotoService - optional panproto service for optic kind classification
 */
function importRoutes(
  app: Hono,
  pluginRegistry: PluginRegistry,
  panprotoService?: IPanprotoService,
): void {
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
   * POST /api/v1/import/dry-run
   *
   * Validates and parses a file, then returns a coverage report and optic
   * kind classification without executing the full import. No authentication
   * required.
   */
  app.post('/api/v1/import/dry-run', async (c: Context) => {
    const body = await c.req.parseBody();

    const file = body.file;
    const formatRaw = body.format;

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

    // Parse the file to get the full result
    const parseResult = await importer.parse(content);

    if (!parseResult.ok) {
      return c.json(
        {
          error: 'PLUGIN_ERROR',
          message: `Parse failed: ${parseResult.error.message}`,
        },
        500,
      );
    }

    const result = parseResult.value;

    // Compute optic kind if panprotoService is available and format maps to a protocol
    let opticKind: OpticKind | null = null;
    const protocolMeta = getProtocolMeta(format);

    if (panprotoService && protocolMeta) {
      try {
        const analysis = await panprotoService.getAnalysis();
        const chain = await panprotoService.getChain(protocolMeta.protocol);
        const schema = await panprotoService.getLayersSchema();
        opticKind = analysis.opticKind(chain, schema);
      } catch {
        // Optic kind computation is best-effort; fall back to null
      }
    }

    // Coverage ratio: derived from the optic kind classification.
    // A successful parse means all records were structurally converted.
    // The optic kind tells us about information fidelity:
    // - iso: lossless bidirectional (1.0)
    // - lens: forward-complete but lossy reverse (1.0 for import)
    // - prism: partial (some inputs may not match; 1.0 here since parse succeeded)
    // - affine: partial and lossy (1.0 here since parse succeeded)
    // - traversal: multi-focus (1.0 here since parse succeeded)
    // If parse succeeded, all input records were covered; coverage is 1.0.
    // The optic kind communicates the round-trip fidelity, not the import coverage.
    const totalRecords =
      result.expressions.length + result.segmentations.length + result.annotationLayers.length;
    const coverageRatio = totalRecords > 0 ? 1.0 : 0.0;

    const response: DryRunResponse = {
      coverageRatio,
      opticKind,
      preview: {
        expressions: result.expressions.length,
        segmentations: result.segmentations.length,
        layers: result.annotationLayers.length,
      },
      metadata: result.metadata as Record<string, unknown> | undefined,
    };

    return c.json(response);
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
export type { DryRunResponse, FieldMapping, FormatInfo };
