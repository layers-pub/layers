/**
 * Annotation tool plugin interface for user-contributed annotation tools.
 *
 * Annotation tool plugins provide custom editing and validation
 * logic for specific annotation kinds, integrating with the
 * frontend annotation workspace.
 *
 * @module
 */

import type { ValidationError } from '../../types/errors.js';
import type { Result } from '../../types/result.js';

import type { IPlugin } from '../core/plugin-interface.js';

/**
 * A single annotation item to validate.
 *
 * Values are restricted to primitive types that can be serialized
 * safely across the plugin sandbox boundary.
 */
type AnnotationItemValue = string | number | boolean;

/**
 * An annotation item represented as a flat key-value map.
 */
type AnnotationItem = Readonly<Record<string, AnnotationItemValue>>;

/**
 * Plugin that contributes an annotation tool to the workspace.
 *
 * Annotation tool plugins declare which annotation kinds they
 * support, whether they allow editing, and provide validation
 * logic for individual annotation items.
 */
interface IAnnotationToolPlugin extends IPlugin {
  /**
   * Annotation kinds this tool can produce or edit.
   *
   * Values should correspond to standard Layers annotation kinds
   * (e.g., "token-tag", "span", "relation", "tree", "tier",
   * "document-tag", "graph").
   */
  readonly supportedKinds: readonly string[];

  /**
   * Whether the tool supports editing existing annotations
   * in addition to creating new ones.
   */
  readonly supportsEditing: boolean;

  /**
   * Validate a single annotation item before it is persisted.
   *
   * @param item - the annotation item to validate
   * @returns void on success, or a ValidationError describing the problem
   */
  validate(item: AnnotationItem): Result<void, ValidationError>;
}

export type { AnnotationItem, AnnotationItemValue, IAnnotationToolPlugin };
