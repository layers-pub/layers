/**
 * Maps generated annotation types to the UI rendering types.
 *
 * Transforms the ATProto lexicon annotation shape (uuid objects, nested
 * anchors) into the flattened AnnotationItem shape used by renderers.
 *
 * @module
 */

import type { components } from '@/lib/api/schema.generated';
import type { Anchor, AnnotationArgument, AnnotationItem } from './types';

/** Annotation type from the OpenAPI-generated schema. */
type ApiAnnotation = components['schemas']['AnnotationDefsAnnotation'];

/** Anchor type from the OpenAPI-generated schema. */
type ApiAnchor = components['schemas']['DefsAnchor'];

/** ArgumentRef type from the OpenAPI-generated schema. */
type ApiArgumentRef = components['schemas']['AnnotationDefsArgumentRef'];

/**
 * Maps a generated Anchor object to the flattened UI Anchor type.
 */
function mapAnchor(raw: ApiAnchor | undefined): Anchor | undefined {
  if (!raw) return undefined;

  if (raw.textSpan) {
    return {
      type: 'textSpan',
      start: raw.textSpan.start,
      end: raw.textSpan.ending,
    };
  }

  if (raw.tokenRef) {
    return {
      type: 'tokenRef',
      tokenIndex: raw.tokenRef.tokenIndex,
    };
  }

  if (raw.tokenRefSequence) {
    return {
      type: 'tokenRefSequence',
      tokenIndices: raw.tokenRefSequence.tokenIndexes,
    };
  }

  if (raw.temporalSpan) {
    return {
      type: 'temporalSpan',
      startTime: raw.temporalSpan.start / 1000,
      endTime: raw.temporalSpan.ending / 1000,
    };
  }

  if (raw.spatioTemporalAnchor) {
    const bbox = raw.spatioTemporalAnchor.keyframes?.[0]?.bbox;
    return {
      type: 'spatioTemporalAnchor',
      startTime: raw.spatioTemporalAnchor.temporalSpan.start / 1000,
      endTime: raw.spatioTemporalAnchor.temporalSpan.ending / 1000,
      x: bbox?.x,
      y: bbox?.y,
      width: bbox?.width,
      height: bbox?.height,
    };
  }

  if (raw.pageAnchor) {
    return {
      type: 'pageAnchor',
      page: raw.pageAnchor.page,
      x: raw.pageAnchor.boundingBox?.x,
      y: raw.pageAnchor.boundingBox?.y,
      width: raw.pageAnchor.boundingBox?.width,
      height: raw.pageAnchor.boundingBox?.height,
      start: raw.pageAnchor.textSpan?.start,
      end: raw.pageAnchor.textSpan?.ending,
    };
  }

  return undefined;
}

/**
 * Maps generated ArgumentRefs to the UI AnnotationArgument type.
 */
function mapArguments(raw: ApiArgumentRef[] | undefined): AnnotationArgument[] | undefined {
  if (!raw?.length) return undefined;

  return raw.map((arg) => ({
    role: arg.role,
    targetId: arg.target.localId?.value ?? arg.target.objectId?.value ?? '',
  }));
}

/**
 * Maps a single generated Annotation to the UI AnnotationItem type.
 */
function mapAnnotation(raw: ApiAnnotation): AnnotationItem {
  return {
    id: raw.uuid.value,
    label: raw.label ?? '',
    value: raw.value ?? raw.text,
    anchor: mapAnchor(raw.anchor),
    confidence: raw.confidence,
    arguments: mapArguments(raw.arguments),
    headIndex: raw.headIndex,
    targetIndex: raw.targetIndex,
    parentId: raw.parentId?.value,
    tokenIndex: raw.tokenIndex,
  };
}

/**
 * Maps an array of generated Annotations to UI AnnotationItems.
 */
function mapAnnotations(raw: ApiAnnotation[]): AnnotationItem[] {
  return raw.map(mapAnnotation);
}

export { mapAnnotation, mapAnnotations, mapAnchor };
export type { ApiAnnotation };
