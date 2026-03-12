/**
 * Authentication and authorization types for Layers.
 *
 * @module
 */

/** Decentralized identifier. */
type DID = `did:${string}`;

/** ATProto handle (username). */
type Handle = string;

/** Authenticated Layers user. */
interface LayersUser {
  readonly did: DID;
  readonly handle: Handle;
  readonly displayName: string;
  readonly avatar: string;
  readonly pdsUrl: string;
  readonly isAdmin: boolean;
}

/** Authentication state tracked by the auth context. */
interface AuthState {
  readonly user: LayersUser | null;
  readonly isLoading: boolean;
  readonly isAuthenticated: boolean;
}

/** Authentication actions available to components. */
interface AuthActions {
  login(handle: string): Promise<void>;
  logout(): Promise<void>;
}

export type { DID, Handle, LayersUser, AuthState, AuthActions };
