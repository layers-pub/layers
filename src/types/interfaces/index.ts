/**
 * Re-exports all abstract interfaces for dependency injection.
 *
 * @module
 */

export type {
  EnrichmentJob,
  EnrichmentResult,
  EnrichmentType,
  IEnrichmentHandler,
} from './enrichment.interface.js';
export type { IGraphBackend } from './graph.interface.js';
export type { ILogger, LogContext } from './logger.interface.js';
export type { IPanprotoService } from './panproto.interface.js';
export type {
  AnnotationFormat,
  IFormatImporter,
  ImportFormat,
  ImportMetadata,
  ImportResult,
  PluginMetadata,
} from './plugin.interface.js';
export type { ISearchEngine, SearchRequest, SearchResponse } from './search.interface.js';
export type { IStorageBackend } from './storage.interface.js';
