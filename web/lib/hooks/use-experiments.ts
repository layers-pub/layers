/**
 * TanStack Query hooks for experiment, judgment set, and agreement report records.
 *
 * @packageDocumentation
 */

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type { components } from '@/lib/api/schema.generated';
import { APIError } from '@/lib/errors';

import { experimentDefKeys, judgmentSetKeys, agreementReportKeys } from './keys';

/** Stale time for experiment queries (120 seconds). */
const EXPERIMENT_STALE_TIME = 120 * 1000;

/** Stale time for judgment set queries (30 seconds). */
const JUDGMENT_SET_STALE_TIME = 30 * 1000;

/** Stale time for agreement report queries (120 seconds). */
const AGREEMENT_REPORT_STALE_TIME = 120 * 1000;

// =============================================================================
// TYPES
// =============================================================================

/**
 * An experiment definition record.
 */
type ExperimentDef = components['schemas']['JudgmentGetExperimentDefOutput'];

/**
 * Paginated response for experiment definition lists.
 */
type ExperimentDefListResponse = components['schemas']['JudgmentListExperimentDefsOutput'];

/**
 * A judgment set record linked to an experiment.
 */
type JudgmentSet = components['schemas']['JudgmentGetJudgmentSetOutput'];

/**
 * Paginated response for judgment set lists.
 */
type JudgmentSetListResponse = components['schemas']['JudgmentListJudgmentSetsOutput'];

/**
 * An agreement report record linked to an experiment.
 */
type AgreementReport = components['schemas']['JudgmentGetAgreementReportOutput'];

/**
 * Paginated response for agreement report lists.
 */
type AgreementReportListResponse = components['schemas']['JudgmentListAgreementReportsOutput'];

// =============================================================================
// FETCH FUNCTIONS
// =============================================================================

async function fetchExperimentDef(uri: string): Promise<ExperimentDef> {
  const { data, error } = await api.GET('/xrpc/pub.layers.judgment.getExperimentDef', {
    params: { query: { uri } },
  });

  if (error || !data) {
    throw new APIError(
      `Failed to fetch experiment: ${uri}`,
      undefined,
      '/xrpc/pub.layers.judgment.getExperimentDef',
    );
  }

  return data;
}

async function fetchExperimentDefs(filters: {
  repo?: string;
  limit?: number;
  cursor?: string;
  measureType?: string;
  taskType?: string;
}): Promise<ExperimentDefListResponse> {
  // repo is optional for global browse; the server returns all records when omitted
  const { data, error } = await api.GET('/xrpc/pub.layers.judgment.listExperimentDefs', {
    params: { query: filters as typeof filters & { repo: string } },
  });

  if (error || !data) {
    throw new APIError(
      'Failed to fetch experiment definitions',
      undefined,
      '/xrpc/pub.layers.judgment.listExperimentDefs',
    );
  }

  return data;
}

async function fetchJudgmentSets(filters: {
  experimentRef: string;
  limit?: number;
  cursor?: string;
}): Promise<JudgmentSetListResponse> {
  const { data, error } = await api.GET('/xrpc/pub.layers.judgment.listJudgmentSets', {
    params: { query: filters },
  });

  if (error || !data) {
    throw new APIError(
      'Failed to fetch judgment sets',
      undefined,
      '/xrpc/pub.layers.judgment.listJudgmentSets',
    );
  }

  return data;
}

async function fetchAgreementReports(filters: {
  experimentRef: string;
  limit?: number;
  cursor?: string;
  metric?: string;
}): Promise<AgreementReportListResponse> {
  const { data, error } = await api.GET('/xrpc/pub.layers.judgment.listAgreementReports', {
    params: { query: filters },
  });

  if (error || !data) {
    throw new APIError(
      'Failed to fetch agreement reports',
      undefined,
      '/xrpc/pub.layers.judgment.listAgreementReports',
    );
  }

  return data;
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Fetches a single experiment definition by AT-URI.
 *
 * @param uri - AT-URI of the experiment definition record
 * @returns query result containing the experiment definition, or an error
 */
function useExperimentDef(uri: string) {
  return useQuery({
    queryKey: experimentDefKeys.detail(uri),
    queryFn: () => fetchExperimentDef(uri),
    enabled: Boolean(uri),
    staleTime: EXPERIMENT_STALE_TIME,
  });
}

/**
 * Fetches a paginated list of experiment definitions with optional filters.
 *
 * @param filters - query parameters for filtering (e.g., repo, limit)
 * @returns query result containing the experiment definition list
 */
function useExperimentDefs(filters: { repo?: string; limit?: number; cursor?: string; measureType?: string; taskType?: string }) {
  return useQuery({
    queryKey: experimentDefKeys.list(filters),
    queryFn: () => fetchExperimentDefs(filters),
    staleTime: EXPERIMENT_STALE_TIME,
  });
}

/**
 * Fetches a paginated list of judgment sets with optional filters.
 *
 * @param filters - query parameters for filtering (e.g., repo, experimentUri, limit)
 * @returns query result containing the judgment set list
 */
function useJudgmentSets(filters: {
  experimentRef: string;
  limit?: number;
  cursor?: string;
}) {
  return useQuery({
    queryKey: judgmentSetKeys.list(filters),
    queryFn: () => fetchJudgmentSets(filters),
    staleTime: JUDGMENT_SET_STALE_TIME,
  });
}

/**
 * Fetches a paginated list of agreement reports with optional filters.
 *
 * @param filters - query parameters for filtering (e.g., repo, experimentUri, limit)
 * @returns query result containing the agreement report list
 */
function useAgreementReports(filters: {
  experimentRef: string;
  limit?: number;
  cursor?: string;
  metric?: string;
}) {
  return useQuery({
    queryKey: agreementReportKeys.list(filters),
    queryFn: () => fetchAgreementReports(filters),
    staleTime: AGREEMENT_REPORT_STALE_TIME,
  });
}

export type {
  ExperimentDef,
  ExperimentDefListResponse,
  JudgmentSet,
  JudgmentSetListResponse,
  AgreementReport,
  AgreementReportListResponse,
};
export { useExperimentDef, useExperimentDefs, useJudgmentSets, useAgreementReports };
