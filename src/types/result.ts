/**
 * Result type for representing success or failure without exceptions.
 *
 * All fallible operations in Layers return {@link Result} instead of throwing.
 * This forces callers to handle errors explicitly at the type level.
 *
 * @module
 */

/**
 * A discriminated union representing either a successful value or an error.
 *
 * @typeParam T - the success value type
 * @typeParam E - the error type (must extend Error)
 *
 * @example
 * ```typescript
 * const result: Result<Expression, NotFoundError> = await service.getExpression(uri);
 * if (isOk(result)) {
 *   console.log(result.value.text);
 * } else {
 *   console.error(result.error.message);
 * }
 * ```
 */
export type Result<T, E extends Error = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/**
 * Creates a successful {@link Result} containing the given value.
 *
 * @param value - the success value to wrap
 * @returns a Result with `ok: true` and the provided value
 *
 * @example
 * ```typescript
 * function parseRecord(data: unknown): Result<Record, ValidationError> {
 *   const parsed = schema.safeParse(data);
 *   if (parsed.success) return Ok(parsed.data);
 *   return Err(new ValidationError("Invalid record", "schema", "invalid"));
 * }
 * ```
 */
export function Ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/**
 * Creates a failed {@link Result} containing the given error.
 *
 * @param error - the error to wrap
 * @returns a Result with `ok: false` and the provided error
 *
 * @example
 * ```typescript
 * function fetchExpression(uri: string): Result<Expression, NotFoundError> {
 *   const record = repository.get(uri);
 *   if (!record) return Err(new NotFoundError("Expression", uri));
 *   return Ok(record);
 * }
 * ```
 */
export function Err<E extends Error>(error: E): Result<never, E> {
  return { ok: false, error };
}

/**
 * Type guard that narrows a {@link Result} to its success variant.
 *
 * @param result - the Result to check
 * @returns `true` if the Result contains a success value
 *
 * @example
 * ```typescript
 * const result = await service.getExpression(uri);
 * if (isOk(result)) {
 *   // result.value is available here
 *   console.log(result.value);
 * }
 * ```
 */
export function isOk<T, E extends Error>(
  result: Result<T, E>,
): result is { readonly ok: true; readonly value: T } {
  return result.ok;
}

/**
 * Type guard that narrows a {@link Result} to its error variant.
 *
 * @param result - the Result to check
 * @returns `true` if the Result contains an error
 *
 * @example
 * ```typescript
 * const result = await service.indexExpression(event);
 * if (isErr(result)) {
 *   logger.error({ error: result.error.message }, "Indexing failed");
 * }
 * ```
 */
export function isErr<T, E extends Error>(
  result: Result<T, E>,
): result is { readonly ok: false; readonly error: E } {
  return !result.ok;
}

/**
 * Extracts the success value from a {@link Result}, or throws the error.
 *
 * Use sparingly. Prefer {@link isOk} / {@link isErr} for explicit handling.
 *
 * @param result - the Result to unwrap
 * @returns the success value
 * @throws the contained error if the Result is a failure
 *
 * @example
 * ```typescript
 * // Only use when you are certain the Result is Ok
 * const value = unwrap(Ok(42)); // 42
 * ```
 */
export function unwrap<T, E extends Error>(result: Result<T, E>): T {
  if (result.ok) return result.value;
  throw result.error;
}

/**
 * Extracts the success value from a {@link Result}, or returns a fallback.
 *
 * @param result - the Result to unwrap
 * @param fallback - the value to return if the Result is a failure
 * @returns the success value, or the fallback
 *
 * @example
 * ```typescript
 * const count = unwrapOr(parseCount(input), 0);
 * ```
 */
export function unwrapOr<T, E extends Error>(result: Result<T, E>, fallback: T): T {
  if (result.ok) return result.value;
  return fallback;
}

/**
 * Transforms the success value of a {@link Result} using the given function.
 *
 * If the Result is an error, it is returned unchanged.
 *
 * @param result - the Result to transform
 * @param fn - the function to apply to the success value
 * @returns a new Result with the transformed value, or the original error
 *
 * @example
 * ```typescript
 * const uriResult: Result<string, Error> = Ok("at://did:plc:abc/pub.layers.expression.expression/123");
 * const lengthResult = map(uriResult, (uri) => uri.length);
 * // Ok(58)
 * ```
 */
export function map<T, U, E extends Error>(
  result: Result<T, E>,
  fn: (value: T) => U,
): Result<U, E> {
  if (result.ok) return Ok(fn(result.value));
  return result;
}

/**
 * Transforms the error of a {@link Result} using the given function.
 *
 * If the Result is a success, it is returned unchanged.
 *
 * @param result - the Result to transform
 * @param fn - the function to apply to the error
 * @returns a new Result with the transformed error, or the original value
 *
 * @example
 * ```typescript
 * const result = mapErr(
 *   fetchResult,
 *   (err) => new DatabaseError("Fetch failed", err),
 * );
 * ```
 */
export function mapErr<T, E extends Error, F extends Error>(
  result: Result<T, E>,
  fn: (error: E) => F,
): Result<T, F> {
  if (result.ok) return result;
  return Err(fn(result.error));
}

/**
 * Chains a fallible operation onto a successful {@link Result}.
 *
 * If the Result is an error, the function is not called and the error
 * is returned unchanged. This is the monadic "bind" or "flatMap" operation.
 *
 * @param result - the Result to chain from
 * @param fn - the function to apply to the success value, returning a new Result
 * @returns the Result from the chained function, or the original error
 *
 * @example
 * ```typescript
 * const result = andThen(
 *   parseUri(input),
 *   (uri) => fetchExpression(uri),
 * );
 * ```
 */
export function andThen<T, U, E extends Error, F extends Error>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, F>,
): Result<U, E | F> {
  if (result.ok) return fn(result.value);
  return result;
}
