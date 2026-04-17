/**
 * Interface every Elasticsearch document mapper satisfies.
 *
 * The only concrete implementation is the lens-driven mapper returned by
 * `documentMapperFromLens`; this type exists so `BaseRepository` can depend
 * on a name rather than a concrete class.
 *
 * @module
 */

export interface IDocumentMapper {
  toDocument(row: Record<string, unknown>): Record<string, unknown>;
}
