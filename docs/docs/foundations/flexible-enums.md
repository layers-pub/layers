---
sidebar_label: "Flexible Enums"
sidebar_position: 4
---

# Flexible Enums

## The Problem with Fixed Enums

Traditional schema design uses fixed enums to constrain field values:

```typescript
annotation = {
  kindEnum: "token-tag" | "span" | "relation" | "tree" | "graph" | "tier" | "document-tag"
  // If you need a new kind, update the schema
}
```

This approach fails for a community-driven, decentralized system:

1. **Lock-in**: New kinds require schema changes, coordination, and versioning.
2. **Incompleteness**: No single enum covers all use cases across all linguistic theories.
3. **Fragility**: Tools that see an unknown kind either fail or ignore it.
4. **Authority**: No single entity can control value assignment in a decentralized system.

## The Solution: URI + Slug Pattern

Layers solves this with a **dual pattern** for every enumerated field:

```typescript
annotationLayer = {
  // Canonical reference: AT-URI to a knowledge graph node
  kindUri?: string              // e.g., "at://did:plc:layers/kinds/span"

  // Fallback slug: human-readable string with known values documented
  kind: string                  // e.g., "span", "tree", "custom-kind"

  annotations: [...]            // per-annotation objects; kind/kindUri apply to all of them
}
```

**How it works**:

1. **Producers** (tools creating annotation layers) can use either:
   - Standard `kindUri` + `kind` (e.g., `kindUri: "at://did:plc:layers/kinds/token-tag"`, `kind: "token-tag"`)
   - Custom `kindUri` pointing to their own knowledge graph node (e.g., `kindUri: "at://did:plc:my-theory/kinds/noun-phrase"`, `kind: "noun-phrase"`)

2. **Consumers** (tools reading annotations) check in order:
   - Is `kindUri` recognized? Use it (canonical source of truth).
   - Unknown `kindUri`? Fall back to `kind` slug (best effort).
   - Unknown `kind`? Skip or warn; do not fail.

3. **Documentation** lists known values as `knownValues`, but does not enforce them:

```typescript
annotationLayer = {
  kindUri?: string  // @at-uri
  kind: string      // knownValues: "token-tag" | "span" | "relation" | "tree" | "graph" | "tier" | "document-tag"
  annotations: [...]
}
```

## Examples

### Standard Kind (Built-in)

```json
{
  "kindUri": "at://did:plc:layers/kinds/token-tag",
  "kind": "token-tag"
}
```

### Custom Kind (User-Defined)

A linguist working in Montague semantics creates their own kind:

```json
{
  "kindUri": "at://did:plc:my-montague-theory/kinds/intensional-object",
  "kind": "intensional-object"
}
```

Tools that recognize the URI handle it accordingly. Tools that don't understand Montague semantics fall back to the slug (best effort) or skip.

### Tag Sets

The same pattern applies to label sets. A POS tagger trained on Penn Treebank emits annotations whose `label` carries the tag, while the enclosing layer records the `labelSet`:

```json
// annotationLayer record
{
  "labelSet": "penn-treebank-pos",
  "annotations": [
    { "uuid": "...", "label": "NN" }
  ]
}
```

A different tagger trained on Universal Dependencies uses:

```json
// annotationLayer record
{
  "labelSet": "universal-pos",
  "annotations": [
    { "uuid": "...", "label": "NOUN" }
  ]
}
```

Both are valid; no schema conflict.

## Extensibility Without Coordination

The result is bottom-up extensibility without coordination:

1. Anyone can create a knowledge graph node for a new kind, tag set, or category.
2. Use its AT-URI in their annotations.
3. Publish the annotations to their PDS.
4. Other tools either recognize the URI or gracefully degrade.
5. Over time, popular new values get documented and added to `knownValues` (if desired).

This avoids central authority over value assignment, eliminates schema versioning for new values, and prevents breaking changes to existing consumers.

## Downside: Ambiguity and Noise

The cost is potential ambiguity: the same linguistic concept might be represented with multiple URIs (e.g., "noun" in 5 different frameworks). Consumers must:

- Implement KB linking to resolve concepts across URIs.
- Tolerate incomplete understanding (some annotations are richer than others).
- Use appviews or indexes to cluster semantically equivalent annotations.

This ambiguity is an expected consequence of supporting multiple linguistic theories and practices simultaneously.

## Reference Semantics

For machines to understand when two `kind` values are semantically equivalent, they should use **knowledge graph linking**:

- Each knowledge graph node for a kind (e.g., "token", "noun") links to external KBs (Wikidata, linguistic ontologies).
- Tools can compare URIs or follow `knowledgeRef` links to determine equivalence.
- A `knowledgeRefs` array on an annotation object explicitly grounds it in external authority, while the layer record carries `kindUri`/`kind`:

```json
// annotationLayer record
{
  "kindUri": "at://did:plc:my-theory/kinds/token-tag",
  "kind": "token-tag",
  "annotations": [
    {
      "uuid": "...",
      "label": "token",
      "knowledgeRefs": [
        {
          "source": "wikidata",
          "identifier": "Q2716717",
          "uri": "https://www.wikidata.org/entity/Q2716717"
        }
      ]
    }
  ]
}
```

## Pattern Across All Lexicons

This pattern is systematic across Layers:

| Field | URI Field | Slug Field | Known Values |
|-------|-----------|-----------|---------------|
| kind | kindUri | kind | "token-tag", "span", "relation", "tree", "graph", "tier", "document-tag" |
| type | typeUri | type | Depends on context (POS, entity type, etc.) |
| geometry format | geometryFormatUri | geometryFormat | "wkt", "geojson", "svg-path", "coco-polygon", "coco-rle", "custom" |
| measureType | measureTypeUri | measureType | "acceptability", "inference", "reading-time", ... |
| taskType | taskTypeUri | taskType | "ordinal-scale", "binary", "forced-choice", ... |
| presentation method | methodUri | method | "rsvp", "self-paced", "whole-sentence", "auditory", ... |
| recording method | methodUri | method | "eeg", "eye-tracking", "keyboard", "button-box", ... |
| item order | itemOrderUri | itemOrder | "random-order", "fixed-order", "blocked", "adaptive" |
| distribution strategy | distributionStrategyUri | distributionStrategy | "latin-square", "random", "blocked", "stratified" |
| source method | sourceMethodUri | sourceMethod | "manual-native", "automatic", "converted", "crowd-sourced", ... |
| assignment strategy | assignmentStrategyUri | assignmentStrategy | "random", "round-robin", "stratified", "expertise-based" |
| adjudication method | methodUri | method | "expert", "majority-vote", "discussion", "dawid-skene", ... |
| quality metric | metricUri | metric | "cohens-kappa", "fleiss-kappa", "krippendorff-alpha", "f1", ... |
| quality scope | scopeUri | scope | "item", "layer", "document", "corpus" |

Consumers should handle both fields transparently; producers should populate at least the slug.

## Implementation Guidance

### For Schema Tools

When generating types from Layers lexicons, represent this pattern:

```typescript
// TypeScript (kindUri/kind live on the annotationLayer record, not the annotation object)
export interface AnnotationLayer {
  kindUri?: string;  // @at-uri
  kind: string;  // @knownValues ["token-tag", "span", "relation", "tree", "graph", "tier", "document-tag"]
  annotations: Annotation[];
}

// JSON Schema
{
  "type": "object",
  "properties": {
    "kindUri": {"type": "string", "format": "at-uri"},
    "kind": {"type": "string", "enum": ["token-tag", "span", "relation", "tree", "graph", "tier", "document-tag"]},
    "annotations": {"type": "array"}
  },
  "required": ["kind", "annotations"]
}
```

Note: The enum is documentation, not validation. Unknown `kind` values should not cause validation failure.

### For Applications

```typescript
// Pseudo-code
function resolveKind(annotation: Annotation): KindDefinition {
  if (annotation.kindUri) {
    try {
      return lookupKindUri(annotation.kindUri);
    } catch (e) {
      // Fall back to slug
    }
  }

  // Resolve slug
  const knownKinds = {...};
  return knownKinds[annotation.kind] || UnknownKind;
}
```
