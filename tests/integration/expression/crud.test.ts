/**
 * Integration test for expression record CRUD operations.
 *
 * Validates the Testcontainers infrastructure by running a full
 * index/retrieve/delete cycle against real database instances.
 *
 * @module
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Redis } from 'ioredis';

import { ExpressionService } from '@/services/expression/expression-service.js';
import { ExpressionsRepository } from '@/storage/postgresql/expressions-repository.js';
import { PostgreSQLAdapter } from '@/storage/postgresql/adapter.js';
import { ElasticsearchAdapter } from '@/storage/elasticsearch/adapter.js';
import { Neo4jAdapter } from '@/storage/neo4j/adapter.js';
import { ExpressionDocumentMapper } from '@/storage/elasticsearch/document-mapper.js';
import { isOk, isErr } from '@/types/result.js';

import {
  createTestInfrastructure,
  type TestInfrastructure,
} from '@tests/helpers/test-containers.js';

describe('Expression CRUD (integration)', () => {
  let infra: TestInfrastructure;
  let expressionService: ExpressionService;

  beforeAll(async () => {
    infra = await createTestInfrastructure();

    // Create the expressions table in the test database
    await infra.pgPool.query(`
      CREATE TABLE IF NOT EXISTS expressions (
        uri TEXT PRIMARY KEY,
        did TEXT NOT NULL,
        rkey TEXT NOT NULL,
        text TEXT,
        kind TEXT,
        language TEXT,
        source_url TEXT,
        source_ref TEXT,
        eprint_ref TEXT,
        parent_ref TEXT,
        indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        record JSONB NOT NULL
      )
    `);

    // Create ES index
    await infra.esClient.indices.create({
      index: 'expressions',
      settings: {
        number_of_shards: 1,
        number_of_replicas: 0,
      },
      mappings: {
        properties: {
          uri: { type: 'keyword' },
          did: { type: 'keyword' },
          text: { type: 'text' },
          kind: { type: 'keyword' },
          language: { type: 'keyword' },
        },
      },
    });

    // Build adapters and service using the test containers
    const pgAdapter = new PostgreSQLAdapter(infra.pgPool);
    const esAdapter = new ElasticsearchAdapter(infra.esClient);
    const neo4jAdapter = new Neo4jAdapter(infra.neo4jDriver);
    const documentMapper = new ExpressionDocumentMapper();

    const repository = new ExpressionsRepository({
      pgAdapter,
      esAdapter,
      neo4jAdapter,
      documentMapper,
    });

    expressionService = new ExpressionService({
      repository,
      redis: infra.redis as unknown as Redis,
    });
  }, 120_000);

  afterAll(async () => {
    if (infra) {
      await infra.teardown();
    }
  }, 30_000);

  it('indexes an expression record and retrieves it by URI', async () => {
    const did = 'did:plc:testuser1';
    const rkey = 'test-rkey-001';
    const record = {
      $type: 'pub.layers.expression.expression',
      text: 'The cat sat on the mat.',
      language: 'en',
      kind: 'sentence',
      createdAt: new Date().toISOString(),
    };

    // Index the record
    const indexResult = await expressionService.indexRecord(did, rkey, record);
    expect(isOk(indexResult)).toBe(true);

    // Retrieve it by URI
    const uri = `at://${did}/pub.layers.expression.expression/${rkey}`;
    const getResult = await expressionService.getByUri(uri);

    expect(isOk(getResult)).toBe(true);
    if (isOk(getResult)) {
      expect(getResult.value.uri).toBe(uri);
      expect(getResult.value.did).toBe(did);
    }
  });

  it('deletes an expression record from all backends', async () => {
    const did = 'did:plc:testuser2';
    const rkey = 'test-rkey-delete';
    const record = {
      $type: 'pub.layers.expression.expression',
      text: 'To be deleted.',
      language: 'en',
      kind: 'sentence',
      createdAt: new Date().toISOString(),
    };

    // Index first
    const indexResult = await expressionService.indexRecord(did, rkey, record);
    expect(isOk(indexResult)).toBe(true);

    // Verify it exists
    const uri = `at://${did}/pub.layers.expression.expression/${rkey}`;
    const beforeDelete = await expressionService.getByUri(uri);
    expect(isOk(beforeDelete)).toBe(true);

    // Delete
    const deleteResult = await expressionService.deleteRecord(uri);
    expect(isOk(deleteResult)).toBe(true);

    // Verify it is gone from PG
    const afterDelete = await expressionService.getByUri(uri);
    expect(isErr(afterDelete)).toBe(true);
    if (isErr(afterDelete)) {
      expect(afterDelete.error.code).toBe('NOT_FOUND');
    }
  });

  it('returns NotFoundError for a non-existent URI', async () => {
    const uri = 'at://did:plc:nobody/pub.layers.expression.expression/nonexistent';
    const result = await expressionService.getByUri(uri);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });
});
