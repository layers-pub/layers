// @ts-nocheck
/**
 * GENERATED CODE - DO NOT MODIFY
 */
import {
  XrpcClient,
  type FetchHandler,
  type FetchHandlerOptions,
} from '@atproto/xrpc'
import { schemas } from './lexicons'
import { CID } from 'multiformats/cid'
import { type OmitKey, type Un$Typed } from './util'
import * as ComAtprotoRepoApplyWrites from './types/com/atproto/repo/applyWrites'
import * as ComAtprotoRepoCreateRecord from './types/com/atproto/repo/createRecord'
import * as ComAtprotoRepoDefs from './types/com/atproto/repo/defs'
import * as ComAtprotoRepoDeleteRecord from './types/com/atproto/repo/deleteRecord'
import * as ComAtprotoRepoDescribeRepo from './types/com/atproto/repo/describeRepo'
import * as ComAtprotoRepoGetRecord from './types/com/atproto/repo/getRecord'
import * as ComAtprotoRepoImportRepo from './types/com/atproto/repo/importRepo'
import * as ComAtprotoRepoListMissingBlobs from './types/com/atproto/repo/listMissingBlobs'
import * as ComAtprotoRepoListRecords from './types/com/atproto/repo/listRecords'
import * as ComAtprotoRepoPutRecord from './types/com/atproto/repo/putRecord'
import * as ComAtprotoRepoStrongRef from './types/com/atproto/repo/strongRef'
import * as ComAtprotoRepoUploadBlob from './types/com/atproto/repo/uploadBlob'
import * as PubLayersAlignmentAlignment from './types/pub/layers/alignment/alignment'
import * as PubLayersAlignmentGetAlignment from './types/pub/layers/alignment/getAlignment'
import * as PubLayersAlignmentListAlignments from './types/pub/layers/alignment/listAlignments'
import * as PubLayersAnnotationAnnotationLayer from './types/pub/layers/annotation/annotationLayer'
import * as PubLayersAnnotationClusterSet from './types/pub/layers/annotation/clusterSet'
import * as PubLayersAnnotationDefs from './types/pub/layers/annotation/defs'
import * as PubLayersAnnotationGetAnnotationLayer from './types/pub/layers/annotation/getAnnotationLayer'
import * as PubLayersAnnotationGetClusterSet from './types/pub/layers/annotation/getClusterSet'
import * as PubLayersAnnotationListAnnotationLayers from './types/pub/layers/annotation/listAnnotationLayers'
import * as PubLayersAnnotationListClusterSets from './types/pub/layers/annotation/listClusterSets'
import * as PubLayersChangelogDefs from './types/pub/layers/changelog/defs'
import * as PubLayersChangelogEntry from './types/pub/layers/changelog/entry'
import * as PubLayersChangelogGetEntry from './types/pub/layers/changelog/getEntry'
import * as PubLayersChangelogListByCollection from './types/pub/layers/changelog/listByCollection'
import * as PubLayersChangelogListEntries from './types/pub/layers/changelog/listEntries'
import * as PubLayersCorpusCorpus from './types/pub/layers/corpus/corpus'
import * as PubLayersCorpusDefs from './types/pub/layers/corpus/defs'
import * as PubLayersCorpusGetCorpus from './types/pub/layers/corpus/getCorpus'
import * as PubLayersCorpusGetMembership from './types/pub/layers/corpus/getMembership'
import * as PubLayersCorpusListCorpora from './types/pub/layers/corpus/listCorpora'
import * as PubLayersCorpusListMemberships from './types/pub/layers/corpus/listMemberships'
import * as PubLayersCorpusMembership from './types/pub/layers/corpus/membership'
import * as PubLayersDefs from './types/pub/layers/defs'
import * as PubLayersEprintDataLink from './types/pub/layers/eprint/dataLink'
import * as PubLayersEprintDefs from './types/pub/layers/eprint/defs'
import * as PubLayersEprintEprint from './types/pub/layers/eprint/eprint'
import * as PubLayersEprintGetDataLink from './types/pub/layers/eprint/getDataLink'
import * as PubLayersEprintGetEprint from './types/pub/layers/eprint/getEprint'
import * as PubLayersEprintListDataLinks from './types/pub/layers/eprint/listDataLinks'
import * as PubLayersEprintListEprints from './types/pub/layers/eprint/listEprints'
import * as PubLayersExpressionExpression from './types/pub/layers/expression/expression'
import * as PubLayersExpressionGetExpression from './types/pub/layers/expression/getExpression'
import * as PubLayersExpressionListExpressions from './types/pub/layers/expression/listExpressions'
import * as PubLayersGraphDefs from './types/pub/layers/graph/defs'
import * as PubLayersGraphGetGraphEdge from './types/pub/layers/graph/getGraphEdge'
import * as PubLayersGraphGetGraphEdgeSet from './types/pub/layers/graph/getGraphEdgeSet'
import * as PubLayersGraphGetGraphNode from './types/pub/layers/graph/getGraphNode'
import * as PubLayersGraphGraphEdge from './types/pub/layers/graph/graphEdge'
import * as PubLayersGraphGraphEdgeSet from './types/pub/layers/graph/graphEdgeSet'
import * as PubLayersGraphGraphNode from './types/pub/layers/graph/graphNode'
import * as PubLayersGraphListGraphEdgeSets from './types/pub/layers/graph/listGraphEdgeSets'
import * as PubLayersGraphListGraphEdges from './types/pub/layers/graph/listGraphEdges'
import * as PubLayersGraphListGraphNodes from './types/pub/layers/graph/listGraphNodes'
import * as PubLayersJudgmentAgreementReport from './types/pub/layers/judgment/agreementReport'
import * as PubLayersJudgmentDefs from './types/pub/layers/judgment/defs'
import * as PubLayersJudgmentExperimentDef from './types/pub/layers/judgment/experimentDef'
import * as PubLayersJudgmentGetAgreementReport from './types/pub/layers/judgment/getAgreementReport'
import * as PubLayersJudgmentGetExperimentDef from './types/pub/layers/judgment/getExperimentDef'
import * as PubLayersJudgmentGetJudgmentSet from './types/pub/layers/judgment/getJudgmentSet'
import * as PubLayersJudgmentJudgmentSet from './types/pub/layers/judgment/judgmentSet'
import * as PubLayersJudgmentListAgreementReports from './types/pub/layers/judgment/listAgreementReports'
import * as PubLayersJudgmentListExperimentDefs from './types/pub/layers/judgment/listExperimentDefs'
import * as PubLayersJudgmentListJudgmentSets from './types/pub/layers/judgment/listJudgmentSets'
import * as PubLayersMediaDefs from './types/pub/layers/media/defs'
import * as PubLayersMediaGetMedia from './types/pub/layers/media/getMedia'
import * as PubLayersMediaListMedia from './types/pub/layers/media/listMedia'
import * as PubLayersMediaMedia from './types/pub/layers/media/media'
import * as PubLayersOntologyDefs from './types/pub/layers/ontology/defs'
import * as PubLayersOntologyGetOntology from './types/pub/layers/ontology/getOntology'
import * as PubLayersOntologyGetTypeDef from './types/pub/layers/ontology/getTypeDef'
import * as PubLayersOntologyListOntologies from './types/pub/layers/ontology/listOntologies'
import * as PubLayersOntologyListTypeDefs from './types/pub/layers/ontology/listTypeDefs'
import * as PubLayersOntologyOntology from './types/pub/layers/ontology/ontology'
import * as PubLayersOntologyTypeDef from './types/pub/layers/ontology/typeDef'
import * as PubLayersPersonaGetPersona from './types/pub/layers/persona/getPersona'
import * as PubLayersPersonaListPersonas from './types/pub/layers/persona/listPersonas'
import * as PubLayersPersonaPersona from './types/pub/layers/persona/persona'
import * as PubLayersResourceCollection from './types/pub/layers/resource/collection'
import * as PubLayersResourceCollectionMembership from './types/pub/layers/resource/collectionMembership'
import * as PubLayersResourceDefs from './types/pub/layers/resource/defs'
import * as PubLayersResourceEntry from './types/pub/layers/resource/entry'
import * as PubLayersResourceFilling from './types/pub/layers/resource/filling'
import * as PubLayersResourceGetCollection from './types/pub/layers/resource/getCollection'
import * as PubLayersResourceGetCollectionMembership from './types/pub/layers/resource/getCollectionMembership'
import * as PubLayersResourceGetEntry from './types/pub/layers/resource/getEntry'
import * as PubLayersResourceGetFilling from './types/pub/layers/resource/getFilling'
import * as PubLayersResourceGetTemplate from './types/pub/layers/resource/getTemplate'
import * as PubLayersResourceGetTemplateComposition from './types/pub/layers/resource/getTemplateComposition'
import * as PubLayersResourceListCollectionMemberships from './types/pub/layers/resource/listCollectionMemberships'
import * as PubLayersResourceListCollections from './types/pub/layers/resource/listCollections'
import * as PubLayersResourceListEntries from './types/pub/layers/resource/listEntries'
import * as PubLayersResourceListFillings from './types/pub/layers/resource/listFillings'
import * as PubLayersResourceListTemplateCompositions from './types/pub/layers/resource/listTemplateCompositions'
import * as PubLayersResourceListTemplates from './types/pub/layers/resource/listTemplates'
import * as PubLayersResourceTemplate from './types/pub/layers/resource/template'
import * as PubLayersResourceTemplateComposition from './types/pub/layers/resource/templateComposition'
import * as PubLayersSegmentationDefs from './types/pub/layers/segmentation/defs'
import * as PubLayersSegmentationGetSegmentation from './types/pub/layers/segmentation/getSegmentation'
import * as PubLayersSegmentationListSegmentations from './types/pub/layers/segmentation/listSegmentations'
import * as PubLayersSegmentationSegmentation from './types/pub/layers/segmentation/segmentation'

export * as ComAtprotoRepoApplyWrites from './types/com/atproto/repo/applyWrites'
export * as ComAtprotoRepoCreateRecord from './types/com/atproto/repo/createRecord'
export * as ComAtprotoRepoDefs from './types/com/atproto/repo/defs'
export * as ComAtprotoRepoDeleteRecord from './types/com/atproto/repo/deleteRecord'
export * as ComAtprotoRepoDescribeRepo from './types/com/atproto/repo/describeRepo'
export * as ComAtprotoRepoGetRecord from './types/com/atproto/repo/getRecord'
export * as ComAtprotoRepoImportRepo from './types/com/atproto/repo/importRepo'
export * as ComAtprotoRepoListMissingBlobs from './types/com/atproto/repo/listMissingBlobs'
export * as ComAtprotoRepoListRecords from './types/com/atproto/repo/listRecords'
export * as ComAtprotoRepoPutRecord from './types/com/atproto/repo/putRecord'
export * as ComAtprotoRepoStrongRef from './types/com/atproto/repo/strongRef'
export * as ComAtprotoRepoUploadBlob from './types/com/atproto/repo/uploadBlob'
export * as PubLayersAlignmentAlignment from './types/pub/layers/alignment/alignment'
export * as PubLayersAlignmentGetAlignment from './types/pub/layers/alignment/getAlignment'
export * as PubLayersAlignmentListAlignments from './types/pub/layers/alignment/listAlignments'
export * as PubLayersAnnotationAnnotationLayer from './types/pub/layers/annotation/annotationLayer'
export * as PubLayersAnnotationClusterSet from './types/pub/layers/annotation/clusterSet'
export * as PubLayersAnnotationDefs from './types/pub/layers/annotation/defs'
export * as PubLayersAnnotationGetAnnotationLayer from './types/pub/layers/annotation/getAnnotationLayer'
export * as PubLayersAnnotationGetClusterSet from './types/pub/layers/annotation/getClusterSet'
export * as PubLayersAnnotationListAnnotationLayers from './types/pub/layers/annotation/listAnnotationLayers'
export * as PubLayersAnnotationListClusterSets from './types/pub/layers/annotation/listClusterSets'
export * as PubLayersChangelogDefs from './types/pub/layers/changelog/defs'
export * as PubLayersChangelogEntry from './types/pub/layers/changelog/entry'
export * as PubLayersChangelogGetEntry from './types/pub/layers/changelog/getEntry'
export * as PubLayersChangelogListByCollection from './types/pub/layers/changelog/listByCollection'
export * as PubLayersChangelogListEntries from './types/pub/layers/changelog/listEntries'
export * as PubLayersCorpusCorpus from './types/pub/layers/corpus/corpus'
export * as PubLayersCorpusDefs from './types/pub/layers/corpus/defs'
export * as PubLayersCorpusGetCorpus from './types/pub/layers/corpus/getCorpus'
export * as PubLayersCorpusGetMembership from './types/pub/layers/corpus/getMembership'
export * as PubLayersCorpusListCorpora from './types/pub/layers/corpus/listCorpora'
export * as PubLayersCorpusListMemberships from './types/pub/layers/corpus/listMemberships'
export * as PubLayersCorpusMembership from './types/pub/layers/corpus/membership'
export * as PubLayersDefs from './types/pub/layers/defs'
export * as PubLayersEprintDataLink from './types/pub/layers/eprint/dataLink'
export * as PubLayersEprintDefs from './types/pub/layers/eprint/defs'
export * as PubLayersEprintEprint from './types/pub/layers/eprint/eprint'
export * as PubLayersEprintGetDataLink from './types/pub/layers/eprint/getDataLink'
export * as PubLayersEprintGetEprint from './types/pub/layers/eprint/getEprint'
export * as PubLayersEprintListDataLinks from './types/pub/layers/eprint/listDataLinks'
export * as PubLayersEprintListEprints from './types/pub/layers/eprint/listEprints'
export * as PubLayersExpressionExpression from './types/pub/layers/expression/expression'
export * as PubLayersExpressionGetExpression from './types/pub/layers/expression/getExpression'
export * as PubLayersExpressionListExpressions from './types/pub/layers/expression/listExpressions'
export * as PubLayersGraphDefs from './types/pub/layers/graph/defs'
export * as PubLayersGraphGetGraphEdge from './types/pub/layers/graph/getGraphEdge'
export * as PubLayersGraphGetGraphEdgeSet from './types/pub/layers/graph/getGraphEdgeSet'
export * as PubLayersGraphGetGraphNode from './types/pub/layers/graph/getGraphNode'
export * as PubLayersGraphGraphEdge from './types/pub/layers/graph/graphEdge'
export * as PubLayersGraphGraphEdgeSet from './types/pub/layers/graph/graphEdgeSet'
export * as PubLayersGraphGraphNode from './types/pub/layers/graph/graphNode'
export * as PubLayersGraphListGraphEdgeSets from './types/pub/layers/graph/listGraphEdgeSets'
export * as PubLayersGraphListGraphEdges from './types/pub/layers/graph/listGraphEdges'
export * as PubLayersGraphListGraphNodes from './types/pub/layers/graph/listGraphNodes'
export * as PubLayersJudgmentAgreementReport from './types/pub/layers/judgment/agreementReport'
export * as PubLayersJudgmentDefs from './types/pub/layers/judgment/defs'
export * as PubLayersJudgmentExperimentDef from './types/pub/layers/judgment/experimentDef'
export * as PubLayersJudgmentGetAgreementReport from './types/pub/layers/judgment/getAgreementReport'
export * as PubLayersJudgmentGetExperimentDef from './types/pub/layers/judgment/getExperimentDef'
export * as PubLayersJudgmentGetJudgmentSet from './types/pub/layers/judgment/getJudgmentSet'
export * as PubLayersJudgmentJudgmentSet from './types/pub/layers/judgment/judgmentSet'
export * as PubLayersJudgmentListAgreementReports from './types/pub/layers/judgment/listAgreementReports'
export * as PubLayersJudgmentListExperimentDefs from './types/pub/layers/judgment/listExperimentDefs'
export * as PubLayersJudgmentListJudgmentSets from './types/pub/layers/judgment/listJudgmentSets'
export * as PubLayersMediaDefs from './types/pub/layers/media/defs'
export * as PubLayersMediaGetMedia from './types/pub/layers/media/getMedia'
export * as PubLayersMediaListMedia from './types/pub/layers/media/listMedia'
export * as PubLayersMediaMedia from './types/pub/layers/media/media'
export * as PubLayersOntologyDefs from './types/pub/layers/ontology/defs'
export * as PubLayersOntologyGetOntology from './types/pub/layers/ontology/getOntology'
export * as PubLayersOntologyGetTypeDef from './types/pub/layers/ontology/getTypeDef'
export * as PubLayersOntologyListOntologies from './types/pub/layers/ontology/listOntologies'
export * as PubLayersOntologyListTypeDefs from './types/pub/layers/ontology/listTypeDefs'
export * as PubLayersOntologyOntology from './types/pub/layers/ontology/ontology'
export * as PubLayersOntologyTypeDef from './types/pub/layers/ontology/typeDef'
export * as PubLayersPersonaGetPersona from './types/pub/layers/persona/getPersona'
export * as PubLayersPersonaListPersonas from './types/pub/layers/persona/listPersonas'
export * as PubLayersPersonaPersona from './types/pub/layers/persona/persona'
export * as PubLayersResourceCollection from './types/pub/layers/resource/collection'
export * as PubLayersResourceCollectionMembership from './types/pub/layers/resource/collectionMembership'
export * as PubLayersResourceDefs from './types/pub/layers/resource/defs'
export * as PubLayersResourceEntry from './types/pub/layers/resource/entry'
export * as PubLayersResourceFilling from './types/pub/layers/resource/filling'
export * as PubLayersResourceGetCollection from './types/pub/layers/resource/getCollection'
export * as PubLayersResourceGetCollectionMembership from './types/pub/layers/resource/getCollectionMembership'
export * as PubLayersResourceGetEntry from './types/pub/layers/resource/getEntry'
export * as PubLayersResourceGetFilling from './types/pub/layers/resource/getFilling'
export * as PubLayersResourceGetTemplate from './types/pub/layers/resource/getTemplate'
export * as PubLayersResourceGetTemplateComposition from './types/pub/layers/resource/getTemplateComposition'
export * as PubLayersResourceListCollectionMemberships from './types/pub/layers/resource/listCollectionMemberships'
export * as PubLayersResourceListCollections from './types/pub/layers/resource/listCollections'
export * as PubLayersResourceListEntries from './types/pub/layers/resource/listEntries'
export * as PubLayersResourceListFillings from './types/pub/layers/resource/listFillings'
export * as PubLayersResourceListTemplateCompositions from './types/pub/layers/resource/listTemplateCompositions'
export * as PubLayersResourceListTemplates from './types/pub/layers/resource/listTemplates'
export * as PubLayersResourceTemplate from './types/pub/layers/resource/template'
export * as PubLayersResourceTemplateComposition from './types/pub/layers/resource/templateComposition'
export * as PubLayersSegmentationDefs from './types/pub/layers/segmentation/defs'
export * as PubLayersSegmentationGetSegmentation from './types/pub/layers/segmentation/getSegmentation'
export * as PubLayersSegmentationListSegmentations from './types/pub/layers/segmentation/listSegmentations'
export * as PubLayersSegmentationSegmentation from './types/pub/layers/segmentation/segmentation'

export class AtpBaseClient extends XrpcClient {
  com: ComNS
  pub: PubNS

  constructor(options: FetchHandler | FetchHandlerOptions) {
    super(options, schemas)
    this.com = new ComNS(this)
    this.pub = new PubNS(this)
  }

  /** @deprecated use `this` instead */
  get xrpc(): XrpcClient {
    return this
  }
}

export class ComNS {
  _client: XrpcClient
  atproto: ComAtprotoNS

  constructor(client: XrpcClient) {
    this._client = client
    this.atproto = new ComAtprotoNS(client)
  }
}

export class ComAtprotoNS {
  _client: XrpcClient
  repo: ComAtprotoRepoNS

  constructor(client: XrpcClient) {
    this._client = client
    this.repo = new ComAtprotoRepoNS(client)
  }
}

export class ComAtprotoRepoNS {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }

  applyWrites(
    data?: ComAtprotoRepoApplyWrites.InputSchema,
    opts?: ComAtprotoRepoApplyWrites.CallOptions,
  ): Promise<ComAtprotoRepoApplyWrites.Response> {
    return this._client
      .call('com.atproto.repo.applyWrites', opts?.qp, data, opts)
      .catch((e) => {
        throw ComAtprotoRepoApplyWrites.toKnownErr(e)
      })
  }

  createRecord(
    data?: ComAtprotoRepoCreateRecord.InputSchema,
    opts?: ComAtprotoRepoCreateRecord.CallOptions,
  ): Promise<ComAtprotoRepoCreateRecord.Response> {
    return this._client
      .call('com.atproto.repo.createRecord', opts?.qp, data, opts)
      .catch((e) => {
        throw ComAtprotoRepoCreateRecord.toKnownErr(e)
      })
  }

  deleteRecord(
    data?: ComAtprotoRepoDeleteRecord.InputSchema,
    opts?: ComAtprotoRepoDeleteRecord.CallOptions,
  ): Promise<ComAtprotoRepoDeleteRecord.Response> {
    return this._client
      .call('com.atproto.repo.deleteRecord', opts?.qp, data, opts)
      .catch((e) => {
        throw ComAtprotoRepoDeleteRecord.toKnownErr(e)
      })
  }

  describeRepo(
    params?: ComAtprotoRepoDescribeRepo.QueryParams,
    opts?: ComAtprotoRepoDescribeRepo.CallOptions,
  ): Promise<ComAtprotoRepoDescribeRepo.Response> {
    return this._client.call(
      'com.atproto.repo.describeRepo',
      params,
      undefined,
      opts,
    )
  }

  getRecord(
    params?: ComAtprotoRepoGetRecord.QueryParams,
    opts?: ComAtprotoRepoGetRecord.CallOptions,
  ): Promise<ComAtprotoRepoGetRecord.Response> {
    return this._client
      .call('com.atproto.repo.getRecord', params, undefined, opts)
      .catch((e) => {
        throw ComAtprotoRepoGetRecord.toKnownErr(e)
      })
  }

  importRepo(
    data?: ComAtprotoRepoImportRepo.InputSchema,
    opts?: ComAtprotoRepoImportRepo.CallOptions,
  ): Promise<ComAtprotoRepoImportRepo.Response> {
    return this._client.call(
      'com.atproto.repo.importRepo',
      opts?.qp,
      data,
      opts,
    )
  }

  listMissingBlobs(
    params?: ComAtprotoRepoListMissingBlobs.QueryParams,
    opts?: ComAtprotoRepoListMissingBlobs.CallOptions,
  ): Promise<ComAtprotoRepoListMissingBlobs.Response> {
    return this._client.call(
      'com.atproto.repo.listMissingBlobs',
      params,
      undefined,
      opts,
    )
  }

  listRecords(
    params?: ComAtprotoRepoListRecords.QueryParams,
    opts?: ComAtprotoRepoListRecords.CallOptions,
  ): Promise<ComAtprotoRepoListRecords.Response> {
    return this._client.call(
      'com.atproto.repo.listRecords',
      params,
      undefined,
      opts,
    )
  }

  putRecord(
    data?: ComAtprotoRepoPutRecord.InputSchema,
    opts?: ComAtprotoRepoPutRecord.CallOptions,
  ): Promise<ComAtprotoRepoPutRecord.Response> {
    return this._client
      .call('com.atproto.repo.putRecord', opts?.qp, data, opts)
      .catch((e) => {
        throw ComAtprotoRepoPutRecord.toKnownErr(e)
      })
  }

  uploadBlob(
    data?: ComAtprotoRepoUploadBlob.InputSchema,
    opts?: ComAtprotoRepoUploadBlob.CallOptions,
  ): Promise<ComAtprotoRepoUploadBlob.Response> {
    return this._client.call(
      'com.atproto.repo.uploadBlob',
      opts?.qp,
      data,
      opts,
    )
  }
}

export class PubNS {
  _client: XrpcClient
  layers: PubLayersNS

  constructor(client: XrpcClient) {
    this._client = client
    this.layers = new PubLayersNS(client)
  }
}

export class PubLayersNS {
  _client: XrpcClient
  alignment: PubLayersAlignmentNS
  annotation: PubLayersAnnotationNS
  changelog: PubLayersChangelogNS
  corpus: PubLayersCorpusNS
  eprint: PubLayersEprintNS
  expression: PubLayersExpressionNS
  graph: PubLayersGraphNS
  judgment: PubLayersJudgmentNS
  media: PubLayersMediaNS
  ontology: PubLayersOntologyNS
  persona: PubLayersPersonaNS
  resource: PubLayersResourceNS
  segmentation: PubLayersSegmentationNS

  constructor(client: XrpcClient) {
    this._client = client
    this.alignment = new PubLayersAlignmentNS(client)
    this.annotation = new PubLayersAnnotationNS(client)
    this.changelog = new PubLayersChangelogNS(client)
    this.corpus = new PubLayersCorpusNS(client)
    this.eprint = new PubLayersEprintNS(client)
    this.expression = new PubLayersExpressionNS(client)
    this.graph = new PubLayersGraphNS(client)
    this.judgment = new PubLayersJudgmentNS(client)
    this.media = new PubLayersMediaNS(client)
    this.ontology = new PubLayersOntologyNS(client)
    this.persona = new PubLayersPersonaNS(client)
    this.resource = new PubLayersResourceNS(client)
    this.segmentation = new PubLayersSegmentationNS(client)
  }
}

export class PubLayersAlignmentNS {
  _client: XrpcClient
  alignment: PubLayersAlignmentAlignmentRecord

  constructor(client: XrpcClient) {
    this._client = client
    this.alignment = new PubLayersAlignmentAlignmentRecord(client)
  }

  getAlignment(
    params?: PubLayersAlignmentGetAlignment.QueryParams,
    opts?: PubLayersAlignmentGetAlignment.CallOptions,
  ): Promise<PubLayersAlignmentGetAlignment.Response> {
    return this._client
      .call('pub.layers.alignment.getAlignment', params, undefined, opts)
      .catch((e) => {
        throw PubLayersAlignmentGetAlignment.toKnownErr(e)
      })
  }

  listAlignments(
    params?: PubLayersAlignmentListAlignments.QueryParams,
    opts?: PubLayersAlignmentListAlignments.CallOptions,
  ): Promise<PubLayersAlignmentListAlignments.Response> {
    return this._client.call(
      'pub.layers.alignment.listAlignments',
      params,
      undefined,
      opts,
    )
  }
}

export class PubLayersAlignmentAlignmentRecord {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>,
  ): Promise<{
    cursor?: string
    records: { uri: string; value: PubLayersAlignmentAlignment.Record }[]
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'pub.layers.alignment.alignment',
      ...params,
    })
    return res.data
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>,
  ): Promise<{
    uri: string
    cid: string
    value: PubLayersAlignmentAlignment.Record
  }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'pub.layers.alignment.alignment',
      ...params,
    })
    return res.data
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersAlignmentAlignment.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.alignment.alignment'
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async put(
    params: OmitKey<
      ComAtprotoRepoPutRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersAlignmentAlignment.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.alignment.alignment'
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'pub.layers.alignment.alignment', ...params },
      { headers },
    )
  }
}

export class PubLayersAnnotationNS {
  _client: XrpcClient
  annotationLayer: PubLayersAnnotationAnnotationLayerRecord
  clusterSet: PubLayersAnnotationClusterSetRecord

  constructor(client: XrpcClient) {
    this._client = client
    this.annotationLayer = new PubLayersAnnotationAnnotationLayerRecord(client)
    this.clusterSet = new PubLayersAnnotationClusterSetRecord(client)
  }

  getAnnotationLayer(
    params?: PubLayersAnnotationGetAnnotationLayer.QueryParams,
    opts?: PubLayersAnnotationGetAnnotationLayer.CallOptions,
  ): Promise<PubLayersAnnotationGetAnnotationLayer.Response> {
    return this._client
      .call('pub.layers.annotation.getAnnotationLayer', params, undefined, opts)
      .catch((e) => {
        throw PubLayersAnnotationGetAnnotationLayer.toKnownErr(e)
      })
  }

  getClusterSet(
    params?: PubLayersAnnotationGetClusterSet.QueryParams,
    opts?: PubLayersAnnotationGetClusterSet.CallOptions,
  ): Promise<PubLayersAnnotationGetClusterSet.Response> {
    return this._client
      .call('pub.layers.annotation.getClusterSet', params, undefined, opts)
      .catch((e) => {
        throw PubLayersAnnotationGetClusterSet.toKnownErr(e)
      })
  }

  listAnnotationLayers(
    params?: PubLayersAnnotationListAnnotationLayers.QueryParams,
    opts?: PubLayersAnnotationListAnnotationLayers.CallOptions,
  ): Promise<PubLayersAnnotationListAnnotationLayers.Response> {
    return this._client.call(
      'pub.layers.annotation.listAnnotationLayers',
      params,
      undefined,
      opts,
    )
  }

  listClusterSets(
    params?: PubLayersAnnotationListClusterSets.QueryParams,
    opts?: PubLayersAnnotationListClusterSets.CallOptions,
  ): Promise<PubLayersAnnotationListClusterSets.Response> {
    return this._client.call(
      'pub.layers.annotation.listClusterSets',
      params,
      undefined,
      opts,
    )
  }
}

export class PubLayersAnnotationAnnotationLayerRecord {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>,
  ): Promise<{
    cursor?: string
    records: { uri: string; value: PubLayersAnnotationAnnotationLayer.Record }[]
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'pub.layers.annotation.annotationLayer',
      ...params,
    })
    return res.data
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>,
  ): Promise<{
    uri: string
    cid: string
    value: PubLayersAnnotationAnnotationLayer.Record
  }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'pub.layers.annotation.annotationLayer',
      ...params,
    })
    return res.data
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersAnnotationAnnotationLayer.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.annotation.annotationLayer'
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async put(
    params: OmitKey<
      ComAtprotoRepoPutRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersAnnotationAnnotationLayer.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.annotation.annotationLayer'
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'pub.layers.annotation.annotationLayer', ...params },
      { headers },
    )
  }
}

export class PubLayersAnnotationClusterSetRecord {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>,
  ): Promise<{
    cursor?: string
    records: { uri: string; value: PubLayersAnnotationClusterSet.Record }[]
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'pub.layers.annotation.clusterSet',
      ...params,
    })
    return res.data
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>,
  ): Promise<{
    uri: string
    cid: string
    value: PubLayersAnnotationClusterSet.Record
  }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'pub.layers.annotation.clusterSet',
      ...params,
    })
    return res.data
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersAnnotationClusterSet.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.annotation.clusterSet'
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async put(
    params: OmitKey<
      ComAtprotoRepoPutRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersAnnotationClusterSet.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.annotation.clusterSet'
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'pub.layers.annotation.clusterSet', ...params },
      { headers },
    )
  }
}

export class PubLayersChangelogNS {
  _client: XrpcClient
  entry: PubLayersChangelogEntryRecord

  constructor(client: XrpcClient) {
    this._client = client
    this.entry = new PubLayersChangelogEntryRecord(client)
  }

  getEntry(
    params?: PubLayersChangelogGetEntry.QueryParams,
    opts?: PubLayersChangelogGetEntry.CallOptions,
  ): Promise<PubLayersChangelogGetEntry.Response> {
    return this._client
      .call('pub.layers.changelog.getEntry', params, undefined, opts)
      .catch((e) => {
        throw PubLayersChangelogGetEntry.toKnownErr(e)
      })
  }

  listByCollection(
    params?: PubLayersChangelogListByCollection.QueryParams,
    opts?: PubLayersChangelogListByCollection.CallOptions,
  ): Promise<PubLayersChangelogListByCollection.Response> {
    return this._client.call(
      'pub.layers.changelog.listByCollection',
      params,
      undefined,
      opts,
    )
  }

  listEntries(
    params?: PubLayersChangelogListEntries.QueryParams,
    opts?: PubLayersChangelogListEntries.CallOptions,
  ): Promise<PubLayersChangelogListEntries.Response> {
    return this._client.call(
      'pub.layers.changelog.listEntries',
      params,
      undefined,
      opts,
    )
  }
}

export class PubLayersChangelogEntryRecord {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>,
  ): Promise<{
    cursor?: string
    records: { uri: string; value: PubLayersChangelogEntry.Record }[]
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'pub.layers.changelog.entry',
      ...params,
    })
    return res.data
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>,
  ): Promise<{
    uri: string
    cid: string
    value: PubLayersChangelogEntry.Record
  }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'pub.layers.changelog.entry',
      ...params,
    })
    return res.data
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersChangelogEntry.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.changelog.entry'
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async put(
    params: OmitKey<
      ComAtprotoRepoPutRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersChangelogEntry.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.changelog.entry'
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'pub.layers.changelog.entry', ...params },
      { headers },
    )
  }
}

export class PubLayersCorpusNS {
  _client: XrpcClient
  corpus: PubLayersCorpusCorpusRecord
  membership: PubLayersCorpusMembershipRecord

  constructor(client: XrpcClient) {
    this._client = client
    this.corpus = new PubLayersCorpusCorpusRecord(client)
    this.membership = new PubLayersCorpusMembershipRecord(client)
  }

  getCorpus(
    params?: PubLayersCorpusGetCorpus.QueryParams,
    opts?: PubLayersCorpusGetCorpus.CallOptions,
  ): Promise<PubLayersCorpusGetCorpus.Response> {
    return this._client
      .call('pub.layers.corpus.getCorpus', params, undefined, opts)
      .catch((e) => {
        throw PubLayersCorpusGetCorpus.toKnownErr(e)
      })
  }

  getMembership(
    params?: PubLayersCorpusGetMembership.QueryParams,
    opts?: PubLayersCorpusGetMembership.CallOptions,
  ): Promise<PubLayersCorpusGetMembership.Response> {
    return this._client
      .call('pub.layers.corpus.getMembership', params, undefined, opts)
      .catch((e) => {
        throw PubLayersCorpusGetMembership.toKnownErr(e)
      })
  }

  listCorpora(
    params?: PubLayersCorpusListCorpora.QueryParams,
    opts?: PubLayersCorpusListCorpora.CallOptions,
  ): Promise<PubLayersCorpusListCorpora.Response> {
    return this._client.call(
      'pub.layers.corpus.listCorpora',
      params,
      undefined,
      opts,
    )
  }

  listMemberships(
    params?: PubLayersCorpusListMemberships.QueryParams,
    opts?: PubLayersCorpusListMemberships.CallOptions,
  ): Promise<PubLayersCorpusListMemberships.Response> {
    return this._client.call(
      'pub.layers.corpus.listMemberships',
      params,
      undefined,
      opts,
    )
  }
}

export class PubLayersCorpusCorpusRecord {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>,
  ): Promise<{
    cursor?: string
    records: { uri: string; value: PubLayersCorpusCorpus.Record }[]
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'pub.layers.corpus.corpus',
      ...params,
    })
    return res.data
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>,
  ): Promise<{
    uri: string
    cid: string
    value: PubLayersCorpusCorpus.Record
  }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'pub.layers.corpus.corpus',
      ...params,
    })
    return res.data
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersCorpusCorpus.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.corpus.corpus'
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async put(
    params: OmitKey<
      ComAtprotoRepoPutRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersCorpusCorpus.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.corpus.corpus'
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'pub.layers.corpus.corpus', ...params },
      { headers },
    )
  }
}

export class PubLayersCorpusMembershipRecord {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>,
  ): Promise<{
    cursor?: string
    records: { uri: string; value: PubLayersCorpusMembership.Record }[]
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'pub.layers.corpus.membership',
      ...params,
    })
    return res.data
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>,
  ): Promise<{
    uri: string
    cid: string
    value: PubLayersCorpusMembership.Record
  }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'pub.layers.corpus.membership',
      ...params,
    })
    return res.data
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersCorpusMembership.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.corpus.membership'
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async put(
    params: OmitKey<
      ComAtprotoRepoPutRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersCorpusMembership.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.corpus.membership'
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'pub.layers.corpus.membership', ...params },
      { headers },
    )
  }
}

export class PubLayersEprintNS {
  _client: XrpcClient
  dataLink: PubLayersEprintDataLinkRecord
  eprint: PubLayersEprintEprintRecord

  constructor(client: XrpcClient) {
    this._client = client
    this.dataLink = new PubLayersEprintDataLinkRecord(client)
    this.eprint = new PubLayersEprintEprintRecord(client)
  }

  getDataLink(
    params?: PubLayersEprintGetDataLink.QueryParams,
    opts?: PubLayersEprintGetDataLink.CallOptions,
  ): Promise<PubLayersEprintGetDataLink.Response> {
    return this._client
      .call('pub.layers.eprint.getDataLink', params, undefined, opts)
      .catch((e) => {
        throw PubLayersEprintGetDataLink.toKnownErr(e)
      })
  }

  getEprint(
    params?: PubLayersEprintGetEprint.QueryParams,
    opts?: PubLayersEprintGetEprint.CallOptions,
  ): Promise<PubLayersEprintGetEprint.Response> {
    return this._client
      .call('pub.layers.eprint.getEprint', params, undefined, opts)
      .catch((e) => {
        throw PubLayersEprintGetEprint.toKnownErr(e)
      })
  }

  listDataLinks(
    params?: PubLayersEprintListDataLinks.QueryParams,
    opts?: PubLayersEprintListDataLinks.CallOptions,
  ): Promise<PubLayersEprintListDataLinks.Response> {
    return this._client.call(
      'pub.layers.eprint.listDataLinks',
      params,
      undefined,
      opts,
    )
  }

  listEprints(
    params?: PubLayersEprintListEprints.QueryParams,
    opts?: PubLayersEprintListEprints.CallOptions,
  ): Promise<PubLayersEprintListEprints.Response> {
    return this._client.call(
      'pub.layers.eprint.listEprints',
      params,
      undefined,
      opts,
    )
  }
}

export class PubLayersEprintDataLinkRecord {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>,
  ): Promise<{
    cursor?: string
    records: { uri: string; value: PubLayersEprintDataLink.Record }[]
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'pub.layers.eprint.dataLink',
      ...params,
    })
    return res.data
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>,
  ): Promise<{
    uri: string
    cid: string
    value: PubLayersEprintDataLink.Record
  }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'pub.layers.eprint.dataLink',
      ...params,
    })
    return res.data
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersEprintDataLink.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.eprint.dataLink'
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async put(
    params: OmitKey<
      ComAtprotoRepoPutRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersEprintDataLink.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.eprint.dataLink'
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'pub.layers.eprint.dataLink', ...params },
      { headers },
    )
  }
}

export class PubLayersEprintEprintRecord {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>,
  ): Promise<{
    cursor?: string
    records: { uri: string; value: PubLayersEprintEprint.Record }[]
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'pub.layers.eprint.eprint',
      ...params,
    })
    return res.data
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>,
  ): Promise<{
    uri: string
    cid: string
    value: PubLayersEprintEprint.Record
  }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'pub.layers.eprint.eprint',
      ...params,
    })
    return res.data
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersEprintEprint.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.eprint.eprint'
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async put(
    params: OmitKey<
      ComAtprotoRepoPutRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersEprintEprint.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.eprint.eprint'
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'pub.layers.eprint.eprint', ...params },
      { headers },
    )
  }
}

export class PubLayersExpressionNS {
  _client: XrpcClient
  expression: PubLayersExpressionExpressionRecord

  constructor(client: XrpcClient) {
    this._client = client
    this.expression = new PubLayersExpressionExpressionRecord(client)
  }

  getExpression(
    params?: PubLayersExpressionGetExpression.QueryParams,
    opts?: PubLayersExpressionGetExpression.CallOptions,
  ): Promise<PubLayersExpressionGetExpression.Response> {
    return this._client
      .call('pub.layers.expression.getExpression', params, undefined, opts)
      .catch((e) => {
        throw PubLayersExpressionGetExpression.toKnownErr(e)
      })
  }

  listExpressions(
    params?: PubLayersExpressionListExpressions.QueryParams,
    opts?: PubLayersExpressionListExpressions.CallOptions,
  ): Promise<PubLayersExpressionListExpressions.Response> {
    return this._client.call(
      'pub.layers.expression.listExpressions',
      params,
      undefined,
      opts,
    )
  }
}

export class PubLayersExpressionExpressionRecord {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>,
  ): Promise<{
    cursor?: string
    records: { uri: string; value: PubLayersExpressionExpression.Record }[]
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'pub.layers.expression.expression',
      ...params,
    })
    return res.data
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>,
  ): Promise<{
    uri: string
    cid: string
    value: PubLayersExpressionExpression.Record
  }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'pub.layers.expression.expression',
      ...params,
    })
    return res.data
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersExpressionExpression.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.expression.expression'
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async put(
    params: OmitKey<
      ComAtprotoRepoPutRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersExpressionExpression.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.expression.expression'
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'pub.layers.expression.expression', ...params },
      { headers },
    )
  }
}

export class PubLayersGraphNS {
  _client: XrpcClient
  graphEdge: PubLayersGraphGraphEdgeRecord
  graphEdgeSet: PubLayersGraphGraphEdgeSetRecord
  graphNode: PubLayersGraphGraphNodeRecord

  constructor(client: XrpcClient) {
    this._client = client
    this.graphEdge = new PubLayersGraphGraphEdgeRecord(client)
    this.graphEdgeSet = new PubLayersGraphGraphEdgeSetRecord(client)
    this.graphNode = new PubLayersGraphGraphNodeRecord(client)
  }

  getGraphEdge(
    params?: PubLayersGraphGetGraphEdge.QueryParams,
    opts?: PubLayersGraphGetGraphEdge.CallOptions,
  ): Promise<PubLayersGraphGetGraphEdge.Response> {
    return this._client
      .call('pub.layers.graph.getGraphEdge', params, undefined, opts)
      .catch((e) => {
        throw PubLayersGraphGetGraphEdge.toKnownErr(e)
      })
  }

  getGraphEdgeSet(
    params?: PubLayersGraphGetGraphEdgeSet.QueryParams,
    opts?: PubLayersGraphGetGraphEdgeSet.CallOptions,
  ): Promise<PubLayersGraphGetGraphEdgeSet.Response> {
    return this._client
      .call('pub.layers.graph.getGraphEdgeSet', params, undefined, opts)
      .catch((e) => {
        throw PubLayersGraphGetGraphEdgeSet.toKnownErr(e)
      })
  }

  getGraphNode(
    params?: PubLayersGraphGetGraphNode.QueryParams,
    opts?: PubLayersGraphGetGraphNode.CallOptions,
  ): Promise<PubLayersGraphGetGraphNode.Response> {
    return this._client
      .call('pub.layers.graph.getGraphNode', params, undefined, opts)
      .catch((e) => {
        throw PubLayersGraphGetGraphNode.toKnownErr(e)
      })
  }

  listGraphEdgeSets(
    params?: PubLayersGraphListGraphEdgeSets.QueryParams,
    opts?: PubLayersGraphListGraphEdgeSets.CallOptions,
  ): Promise<PubLayersGraphListGraphEdgeSets.Response> {
    return this._client.call(
      'pub.layers.graph.listGraphEdgeSets',
      params,
      undefined,
      opts,
    )
  }

  listGraphEdges(
    params?: PubLayersGraphListGraphEdges.QueryParams,
    opts?: PubLayersGraphListGraphEdges.CallOptions,
  ): Promise<PubLayersGraphListGraphEdges.Response> {
    return this._client.call(
      'pub.layers.graph.listGraphEdges',
      params,
      undefined,
      opts,
    )
  }

  listGraphNodes(
    params?: PubLayersGraphListGraphNodes.QueryParams,
    opts?: PubLayersGraphListGraphNodes.CallOptions,
  ): Promise<PubLayersGraphListGraphNodes.Response> {
    return this._client.call(
      'pub.layers.graph.listGraphNodes',
      params,
      undefined,
      opts,
    )
  }
}

export class PubLayersGraphGraphEdgeRecord {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>,
  ): Promise<{
    cursor?: string
    records: { uri: string; value: PubLayersGraphGraphEdge.Record }[]
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'pub.layers.graph.graphEdge',
      ...params,
    })
    return res.data
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>,
  ): Promise<{
    uri: string
    cid: string
    value: PubLayersGraphGraphEdge.Record
  }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'pub.layers.graph.graphEdge',
      ...params,
    })
    return res.data
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersGraphGraphEdge.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.graph.graphEdge'
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async put(
    params: OmitKey<
      ComAtprotoRepoPutRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersGraphGraphEdge.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.graph.graphEdge'
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'pub.layers.graph.graphEdge', ...params },
      { headers },
    )
  }
}

export class PubLayersGraphGraphEdgeSetRecord {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>,
  ): Promise<{
    cursor?: string
    records: { uri: string; value: PubLayersGraphGraphEdgeSet.Record }[]
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'pub.layers.graph.graphEdgeSet',
      ...params,
    })
    return res.data
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>,
  ): Promise<{
    uri: string
    cid: string
    value: PubLayersGraphGraphEdgeSet.Record
  }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'pub.layers.graph.graphEdgeSet',
      ...params,
    })
    return res.data
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersGraphGraphEdgeSet.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.graph.graphEdgeSet'
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async put(
    params: OmitKey<
      ComAtprotoRepoPutRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersGraphGraphEdgeSet.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.graph.graphEdgeSet'
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'pub.layers.graph.graphEdgeSet', ...params },
      { headers },
    )
  }
}

export class PubLayersGraphGraphNodeRecord {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>,
  ): Promise<{
    cursor?: string
    records: { uri: string; value: PubLayersGraphGraphNode.Record }[]
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'pub.layers.graph.graphNode',
      ...params,
    })
    return res.data
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>,
  ): Promise<{
    uri: string
    cid: string
    value: PubLayersGraphGraphNode.Record
  }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'pub.layers.graph.graphNode',
      ...params,
    })
    return res.data
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersGraphGraphNode.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.graph.graphNode'
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async put(
    params: OmitKey<
      ComAtprotoRepoPutRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersGraphGraphNode.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.graph.graphNode'
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'pub.layers.graph.graphNode', ...params },
      { headers },
    )
  }
}

export class PubLayersJudgmentNS {
  _client: XrpcClient
  agreementReport: PubLayersJudgmentAgreementReportRecord
  experimentDef: PubLayersJudgmentExperimentDefRecord
  judgmentSet: PubLayersJudgmentJudgmentSetRecord

  constructor(client: XrpcClient) {
    this._client = client
    this.agreementReport = new PubLayersJudgmentAgreementReportRecord(client)
    this.experimentDef = new PubLayersJudgmentExperimentDefRecord(client)
    this.judgmentSet = new PubLayersJudgmentJudgmentSetRecord(client)
  }

  getAgreementReport(
    params?: PubLayersJudgmentGetAgreementReport.QueryParams,
    opts?: PubLayersJudgmentGetAgreementReport.CallOptions,
  ): Promise<PubLayersJudgmentGetAgreementReport.Response> {
    return this._client
      .call('pub.layers.judgment.getAgreementReport', params, undefined, opts)
      .catch((e) => {
        throw PubLayersJudgmentGetAgreementReport.toKnownErr(e)
      })
  }

  getExperimentDef(
    params?: PubLayersJudgmentGetExperimentDef.QueryParams,
    opts?: PubLayersJudgmentGetExperimentDef.CallOptions,
  ): Promise<PubLayersJudgmentGetExperimentDef.Response> {
    return this._client
      .call('pub.layers.judgment.getExperimentDef', params, undefined, opts)
      .catch((e) => {
        throw PubLayersJudgmentGetExperimentDef.toKnownErr(e)
      })
  }

  getJudgmentSet(
    params?: PubLayersJudgmentGetJudgmentSet.QueryParams,
    opts?: PubLayersJudgmentGetJudgmentSet.CallOptions,
  ): Promise<PubLayersJudgmentGetJudgmentSet.Response> {
    return this._client
      .call('pub.layers.judgment.getJudgmentSet', params, undefined, opts)
      .catch((e) => {
        throw PubLayersJudgmentGetJudgmentSet.toKnownErr(e)
      })
  }

  listAgreementReports(
    params?: PubLayersJudgmentListAgreementReports.QueryParams,
    opts?: PubLayersJudgmentListAgreementReports.CallOptions,
  ): Promise<PubLayersJudgmentListAgreementReports.Response> {
    return this._client.call(
      'pub.layers.judgment.listAgreementReports',
      params,
      undefined,
      opts,
    )
  }

  listExperimentDefs(
    params?: PubLayersJudgmentListExperimentDefs.QueryParams,
    opts?: PubLayersJudgmentListExperimentDefs.CallOptions,
  ): Promise<PubLayersJudgmentListExperimentDefs.Response> {
    return this._client.call(
      'pub.layers.judgment.listExperimentDefs',
      params,
      undefined,
      opts,
    )
  }

  listJudgmentSets(
    params?: PubLayersJudgmentListJudgmentSets.QueryParams,
    opts?: PubLayersJudgmentListJudgmentSets.CallOptions,
  ): Promise<PubLayersJudgmentListJudgmentSets.Response> {
    return this._client.call(
      'pub.layers.judgment.listJudgmentSets',
      params,
      undefined,
      opts,
    )
  }
}

export class PubLayersJudgmentAgreementReportRecord {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>,
  ): Promise<{
    cursor?: string
    records: { uri: string; value: PubLayersJudgmentAgreementReport.Record }[]
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'pub.layers.judgment.agreementReport',
      ...params,
    })
    return res.data
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>,
  ): Promise<{
    uri: string
    cid: string
    value: PubLayersJudgmentAgreementReport.Record
  }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'pub.layers.judgment.agreementReport',
      ...params,
    })
    return res.data
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersJudgmentAgreementReport.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.judgment.agreementReport'
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async put(
    params: OmitKey<
      ComAtprotoRepoPutRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersJudgmentAgreementReport.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.judgment.agreementReport'
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'pub.layers.judgment.agreementReport', ...params },
      { headers },
    )
  }
}

export class PubLayersJudgmentExperimentDefRecord {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>,
  ): Promise<{
    cursor?: string
    records: { uri: string; value: PubLayersJudgmentExperimentDef.Record }[]
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'pub.layers.judgment.experimentDef',
      ...params,
    })
    return res.data
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>,
  ): Promise<{
    uri: string
    cid: string
    value: PubLayersJudgmentExperimentDef.Record
  }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'pub.layers.judgment.experimentDef',
      ...params,
    })
    return res.data
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersJudgmentExperimentDef.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.judgment.experimentDef'
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async put(
    params: OmitKey<
      ComAtprotoRepoPutRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersJudgmentExperimentDef.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.judgment.experimentDef'
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'pub.layers.judgment.experimentDef', ...params },
      { headers },
    )
  }
}

export class PubLayersJudgmentJudgmentSetRecord {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>,
  ): Promise<{
    cursor?: string
    records: { uri: string; value: PubLayersJudgmentJudgmentSet.Record }[]
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'pub.layers.judgment.judgmentSet',
      ...params,
    })
    return res.data
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>,
  ): Promise<{
    uri: string
    cid: string
    value: PubLayersJudgmentJudgmentSet.Record
  }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'pub.layers.judgment.judgmentSet',
      ...params,
    })
    return res.data
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersJudgmentJudgmentSet.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.judgment.judgmentSet'
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async put(
    params: OmitKey<
      ComAtprotoRepoPutRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersJudgmentJudgmentSet.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.judgment.judgmentSet'
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'pub.layers.judgment.judgmentSet', ...params },
      { headers },
    )
  }
}

export class PubLayersMediaNS {
  _client: XrpcClient
  media: PubLayersMediaMediaRecord

  constructor(client: XrpcClient) {
    this._client = client
    this.media = new PubLayersMediaMediaRecord(client)
  }

  getMedia(
    params?: PubLayersMediaGetMedia.QueryParams,
    opts?: PubLayersMediaGetMedia.CallOptions,
  ): Promise<PubLayersMediaGetMedia.Response> {
    return this._client
      .call('pub.layers.media.getMedia', params, undefined, opts)
      .catch((e) => {
        throw PubLayersMediaGetMedia.toKnownErr(e)
      })
  }

  listMedia(
    params?: PubLayersMediaListMedia.QueryParams,
    opts?: PubLayersMediaListMedia.CallOptions,
  ): Promise<PubLayersMediaListMedia.Response> {
    return this._client.call(
      'pub.layers.media.listMedia',
      params,
      undefined,
      opts,
    )
  }
}

export class PubLayersMediaMediaRecord {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>,
  ): Promise<{
    cursor?: string
    records: { uri: string; value: PubLayersMediaMedia.Record }[]
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'pub.layers.media.media',
      ...params,
    })
    return res.data
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>,
  ): Promise<{ uri: string; cid: string; value: PubLayersMediaMedia.Record }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'pub.layers.media.media',
      ...params,
    })
    return res.data
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersMediaMedia.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.media.media'
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async put(
    params: OmitKey<
      ComAtprotoRepoPutRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersMediaMedia.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.media.media'
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'pub.layers.media.media', ...params },
      { headers },
    )
  }
}

export class PubLayersOntologyNS {
  _client: XrpcClient
  ontology: PubLayersOntologyOntologyRecord
  typeDef: PubLayersOntologyTypeDefRecord

  constructor(client: XrpcClient) {
    this._client = client
    this.ontology = new PubLayersOntologyOntologyRecord(client)
    this.typeDef = new PubLayersOntologyTypeDefRecord(client)
  }

  getOntology(
    params?: PubLayersOntologyGetOntology.QueryParams,
    opts?: PubLayersOntologyGetOntology.CallOptions,
  ): Promise<PubLayersOntologyGetOntology.Response> {
    return this._client
      .call('pub.layers.ontology.getOntology', params, undefined, opts)
      .catch((e) => {
        throw PubLayersOntologyGetOntology.toKnownErr(e)
      })
  }

  getTypeDef(
    params?: PubLayersOntologyGetTypeDef.QueryParams,
    opts?: PubLayersOntologyGetTypeDef.CallOptions,
  ): Promise<PubLayersOntologyGetTypeDef.Response> {
    return this._client
      .call('pub.layers.ontology.getTypeDef', params, undefined, opts)
      .catch((e) => {
        throw PubLayersOntologyGetTypeDef.toKnownErr(e)
      })
  }

  listOntologies(
    params?: PubLayersOntologyListOntologies.QueryParams,
    opts?: PubLayersOntologyListOntologies.CallOptions,
  ): Promise<PubLayersOntologyListOntologies.Response> {
    return this._client.call(
      'pub.layers.ontology.listOntologies',
      params,
      undefined,
      opts,
    )
  }

  listTypeDefs(
    params?: PubLayersOntologyListTypeDefs.QueryParams,
    opts?: PubLayersOntologyListTypeDefs.CallOptions,
  ): Promise<PubLayersOntologyListTypeDefs.Response> {
    return this._client.call(
      'pub.layers.ontology.listTypeDefs',
      params,
      undefined,
      opts,
    )
  }
}

export class PubLayersOntologyOntologyRecord {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>,
  ): Promise<{
    cursor?: string
    records: { uri: string; value: PubLayersOntologyOntology.Record }[]
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'pub.layers.ontology.ontology',
      ...params,
    })
    return res.data
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>,
  ): Promise<{
    uri: string
    cid: string
    value: PubLayersOntologyOntology.Record
  }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'pub.layers.ontology.ontology',
      ...params,
    })
    return res.data
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersOntologyOntology.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.ontology.ontology'
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async put(
    params: OmitKey<
      ComAtprotoRepoPutRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersOntologyOntology.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.ontology.ontology'
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'pub.layers.ontology.ontology', ...params },
      { headers },
    )
  }
}

export class PubLayersOntologyTypeDefRecord {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>,
  ): Promise<{
    cursor?: string
    records: { uri: string; value: PubLayersOntologyTypeDef.Record }[]
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'pub.layers.ontology.typeDef',
      ...params,
    })
    return res.data
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>,
  ): Promise<{
    uri: string
    cid: string
    value: PubLayersOntologyTypeDef.Record
  }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'pub.layers.ontology.typeDef',
      ...params,
    })
    return res.data
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersOntologyTypeDef.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.ontology.typeDef'
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async put(
    params: OmitKey<
      ComAtprotoRepoPutRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersOntologyTypeDef.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.ontology.typeDef'
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'pub.layers.ontology.typeDef', ...params },
      { headers },
    )
  }
}

export class PubLayersPersonaNS {
  _client: XrpcClient
  persona: PubLayersPersonaPersonaRecord

  constructor(client: XrpcClient) {
    this._client = client
    this.persona = new PubLayersPersonaPersonaRecord(client)
  }

  getPersona(
    params?: PubLayersPersonaGetPersona.QueryParams,
    opts?: PubLayersPersonaGetPersona.CallOptions,
  ): Promise<PubLayersPersonaGetPersona.Response> {
    return this._client
      .call('pub.layers.persona.getPersona', params, undefined, opts)
      .catch((e) => {
        throw PubLayersPersonaGetPersona.toKnownErr(e)
      })
  }

  listPersonas(
    params?: PubLayersPersonaListPersonas.QueryParams,
    opts?: PubLayersPersonaListPersonas.CallOptions,
  ): Promise<PubLayersPersonaListPersonas.Response> {
    return this._client.call(
      'pub.layers.persona.listPersonas',
      params,
      undefined,
      opts,
    )
  }
}

export class PubLayersPersonaPersonaRecord {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>,
  ): Promise<{
    cursor?: string
    records: { uri: string; value: PubLayersPersonaPersona.Record }[]
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'pub.layers.persona.persona',
      ...params,
    })
    return res.data
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>,
  ): Promise<{
    uri: string
    cid: string
    value: PubLayersPersonaPersona.Record
  }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'pub.layers.persona.persona',
      ...params,
    })
    return res.data
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersPersonaPersona.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.persona.persona'
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async put(
    params: OmitKey<
      ComAtprotoRepoPutRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersPersonaPersona.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.persona.persona'
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'pub.layers.persona.persona', ...params },
      { headers },
    )
  }
}

export class PubLayersResourceNS {
  _client: XrpcClient
  collection: PubLayersResourceCollectionRecord
  collectionMembership: PubLayersResourceCollectionMembershipRecord
  entry: PubLayersResourceEntryRecord
  filling: PubLayersResourceFillingRecord
  template: PubLayersResourceTemplateRecord
  templateComposition: PubLayersResourceTemplateCompositionRecord

  constructor(client: XrpcClient) {
    this._client = client
    this.collection = new PubLayersResourceCollectionRecord(client)
    this.collectionMembership = new PubLayersResourceCollectionMembershipRecord(
      client,
    )
    this.entry = new PubLayersResourceEntryRecord(client)
    this.filling = new PubLayersResourceFillingRecord(client)
    this.template = new PubLayersResourceTemplateRecord(client)
    this.templateComposition = new PubLayersResourceTemplateCompositionRecord(
      client,
    )
  }

  getCollection(
    params?: PubLayersResourceGetCollection.QueryParams,
    opts?: PubLayersResourceGetCollection.CallOptions,
  ): Promise<PubLayersResourceGetCollection.Response> {
    return this._client
      .call('pub.layers.resource.getCollection', params, undefined, opts)
      .catch((e) => {
        throw PubLayersResourceGetCollection.toKnownErr(e)
      })
  }

  getCollectionMembership(
    params?: PubLayersResourceGetCollectionMembership.QueryParams,
    opts?: PubLayersResourceGetCollectionMembership.CallOptions,
  ): Promise<PubLayersResourceGetCollectionMembership.Response> {
    return this._client
      .call(
        'pub.layers.resource.getCollectionMembership',
        params,
        undefined,
        opts,
      )
      .catch((e) => {
        throw PubLayersResourceGetCollectionMembership.toKnownErr(e)
      })
  }

  getEntry(
    params?: PubLayersResourceGetEntry.QueryParams,
    opts?: PubLayersResourceGetEntry.CallOptions,
  ): Promise<PubLayersResourceGetEntry.Response> {
    return this._client
      .call('pub.layers.resource.getEntry', params, undefined, opts)
      .catch((e) => {
        throw PubLayersResourceGetEntry.toKnownErr(e)
      })
  }

  getFilling(
    params?: PubLayersResourceGetFilling.QueryParams,
    opts?: PubLayersResourceGetFilling.CallOptions,
  ): Promise<PubLayersResourceGetFilling.Response> {
    return this._client
      .call('pub.layers.resource.getFilling', params, undefined, opts)
      .catch((e) => {
        throw PubLayersResourceGetFilling.toKnownErr(e)
      })
  }

  getTemplate(
    params?: PubLayersResourceGetTemplate.QueryParams,
    opts?: PubLayersResourceGetTemplate.CallOptions,
  ): Promise<PubLayersResourceGetTemplate.Response> {
    return this._client
      .call('pub.layers.resource.getTemplate', params, undefined, opts)
      .catch((e) => {
        throw PubLayersResourceGetTemplate.toKnownErr(e)
      })
  }

  getTemplateComposition(
    params?: PubLayersResourceGetTemplateComposition.QueryParams,
    opts?: PubLayersResourceGetTemplateComposition.CallOptions,
  ): Promise<PubLayersResourceGetTemplateComposition.Response> {
    return this._client
      .call(
        'pub.layers.resource.getTemplateComposition',
        params,
        undefined,
        opts,
      )
      .catch((e) => {
        throw PubLayersResourceGetTemplateComposition.toKnownErr(e)
      })
  }

  listCollectionMemberships(
    params?: PubLayersResourceListCollectionMemberships.QueryParams,
    opts?: PubLayersResourceListCollectionMemberships.CallOptions,
  ): Promise<PubLayersResourceListCollectionMemberships.Response> {
    return this._client.call(
      'pub.layers.resource.listCollectionMemberships',
      params,
      undefined,
      opts,
    )
  }

  listCollections(
    params?: PubLayersResourceListCollections.QueryParams,
    opts?: PubLayersResourceListCollections.CallOptions,
  ): Promise<PubLayersResourceListCollections.Response> {
    return this._client.call(
      'pub.layers.resource.listCollections',
      params,
      undefined,
      opts,
    )
  }

  listEntries(
    params?: PubLayersResourceListEntries.QueryParams,
    opts?: PubLayersResourceListEntries.CallOptions,
  ): Promise<PubLayersResourceListEntries.Response> {
    return this._client.call(
      'pub.layers.resource.listEntries',
      params,
      undefined,
      opts,
    )
  }

  listFillings(
    params?: PubLayersResourceListFillings.QueryParams,
    opts?: PubLayersResourceListFillings.CallOptions,
  ): Promise<PubLayersResourceListFillings.Response> {
    return this._client.call(
      'pub.layers.resource.listFillings',
      params,
      undefined,
      opts,
    )
  }

  listTemplateCompositions(
    params?: PubLayersResourceListTemplateCompositions.QueryParams,
    opts?: PubLayersResourceListTemplateCompositions.CallOptions,
  ): Promise<PubLayersResourceListTemplateCompositions.Response> {
    return this._client.call(
      'pub.layers.resource.listTemplateCompositions',
      params,
      undefined,
      opts,
    )
  }

  listTemplates(
    params?: PubLayersResourceListTemplates.QueryParams,
    opts?: PubLayersResourceListTemplates.CallOptions,
  ): Promise<PubLayersResourceListTemplates.Response> {
    return this._client.call(
      'pub.layers.resource.listTemplates',
      params,
      undefined,
      opts,
    )
  }
}

export class PubLayersResourceCollectionRecord {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>,
  ): Promise<{
    cursor?: string
    records: { uri: string; value: PubLayersResourceCollection.Record }[]
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'pub.layers.resource.collection',
      ...params,
    })
    return res.data
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>,
  ): Promise<{
    uri: string
    cid: string
    value: PubLayersResourceCollection.Record
  }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'pub.layers.resource.collection',
      ...params,
    })
    return res.data
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersResourceCollection.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.resource.collection'
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async put(
    params: OmitKey<
      ComAtprotoRepoPutRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersResourceCollection.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.resource.collection'
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'pub.layers.resource.collection', ...params },
      { headers },
    )
  }
}

export class PubLayersResourceCollectionMembershipRecord {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>,
  ): Promise<{
    cursor?: string
    records: {
      uri: string
      value: PubLayersResourceCollectionMembership.Record
    }[]
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'pub.layers.resource.collectionMembership',
      ...params,
    })
    return res.data
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>,
  ): Promise<{
    uri: string
    cid: string
    value: PubLayersResourceCollectionMembership.Record
  }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'pub.layers.resource.collectionMembership',
      ...params,
    })
    return res.data
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersResourceCollectionMembership.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.resource.collectionMembership'
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async put(
    params: OmitKey<
      ComAtprotoRepoPutRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersResourceCollectionMembership.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.resource.collectionMembership'
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'pub.layers.resource.collectionMembership', ...params },
      { headers },
    )
  }
}

export class PubLayersResourceEntryRecord {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>,
  ): Promise<{
    cursor?: string
    records: { uri: string; value: PubLayersResourceEntry.Record }[]
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'pub.layers.resource.entry',
      ...params,
    })
    return res.data
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>,
  ): Promise<{
    uri: string
    cid: string
    value: PubLayersResourceEntry.Record
  }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'pub.layers.resource.entry',
      ...params,
    })
    return res.data
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersResourceEntry.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.resource.entry'
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async put(
    params: OmitKey<
      ComAtprotoRepoPutRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersResourceEntry.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.resource.entry'
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'pub.layers.resource.entry', ...params },
      { headers },
    )
  }
}

export class PubLayersResourceFillingRecord {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>,
  ): Promise<{
    cursor?: string
    records: { uri: string; value: PubLayersResourceFilling.Record }[]
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'pub.layers.resource.filling',
      ...params,
    })
    return res.data
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>,
  ): Promise<{
    uri: string
    cid: string
    value: PubLayersResourceFilling.Record
  }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'pub.layers.resource.filling',
      ...params,
    })
    return res.data
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersResourceFilling.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.resource.filling'
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async put(
    params: OmitKey<
      ComAtprotoRepoPutRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersResourceFilling.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.resource.filling'
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'pub.layers.resource.filling', ...params },
      { headers },
    )
  }
}

export class PubLayersResourceTemplateRecord {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>,
  ): Promise<{
    cursor?: string
    records: { uri: string; value: PubLayersResourceTemplate.Record }[]
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'pub.layers.resource.template',
      ...params,
    })
    return res.data
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>,
  ): Promise<{
    uri: string
    cid: string
    value: PubLayersResourceTemplate.Record
  }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'pub.layers.resource.template',
      ...params,
    })
    return res.data
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersResourceTemplate.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.resource.template'
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async put(
    params: OmitKey<
      ComAtprotoRepoPutRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersResourceTemplate.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.resource.template'
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'pub.layers.resource.template', ...params },
      { headers },
    )
  }
}

export class PubLayersResourceTemplateCompositionRecord {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>,
  ): Promise<{
    cursor?: string
    records: {
      uri: string
      value: PubLayersResourceTemplateComposition.Record
    }[]
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'pub.layers.resource.templateComposition',
      ...params,
    })
    return res.data
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>,
  ): Promise<{
    uri: string
    cid: string
    value: PubLayersResourceTemplateComposition.Record
  }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'pub.layers.resource.templateComposition',
      ...params,
    })
    return res.data
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersResourceTemplateComposition.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.resource.templateComposition'
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async put(
    params: OmitKey<
      ComAtprotoRepoPutRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersResourceTemplateComposition.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.resource.templateComposition'
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'pub.layers.resource.templateComposition', ...params },
      { headers },
    )
  }
}

export class PubLayersSegmentationNS {
  _client: XrpcClient
  segmentation: PubLayersSegmentationSegmentationRecord

  constructor(client: XrpcClient) {
    this._client = client
    this.segmentation = new PubLayersSegmentationSegmentationRecord(client)
  }

  getSegmentation(
    params?: PubLayersSegmentationGetSegmentation.QueryParams,
    opts?: PubLayersSegmentationGetSegmentation.CallOptions,
  ): Promise<PubLayersSegmentationGetSegmentation.Response> {
    return this._client
      .call('pub.layers.segmentation.getSegmentation', params, undefined, opts)
      .catch((e) => {
        throw PubLayersSegmentationGetSegmentation.toKnownErr(e)
      })
  }

  listSegmentations(
    params?: PubLayersSegmentationListSegmentations.QueryParams,
    opts?: PubLayersSegmentationListSegmentations.CallOptions,
  ): Promise<PubLayersSegmentationListSegmentations.Response> {
    return this._client.call(
      'pub.layers.segmentation.listSegmentations',
      params,
      undefined,
      opts,
    )
  }
}

export class PubLayersSegmentationSegmentationRecord {
  _client: XrpcClient

  constructor(client: XrpcClient) {
    this._client = client
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, 'collection'>,
  ): Promise<{
    cursor?: string
    records: { uri: string; value: PubLayersSegmentationSegmentation.Record }[]
  }> {
    const res = await this._client.call('com.atproto.repo.listRecords', {
      collection: 'pub.layers.segmentation.segmentation',
      ...params,
    })
    return res.data
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, 'collection'>,
  ): Promise<{
    uri: string
    cid: string
    value: PubLayersSegmentationSegmentation.Record
  }> {
    const res = await this._client.call('com.atproto.repo.getRecord', {
      collection: 'pub.layers.segmentation.segmentation',
      ...params,
    })
    return res.data
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersSegmentationSegmentation.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.segmentation.segmentation'
    const res = await this._client.call(
      'com.atproto.repo.createRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async put(
    params: OmitKey<
      ComAtprotoRepoPutRecord.InputSchema,
      'collection' | 'record'
    >,
    record: Un$Typed<PubLayersSegmentationSegmentation.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = 'pub.layers.segmentation.segmentation'
    const res = await this._client.call(
      'com.atproto.repo.putRecord',
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: 'application/json', headers },
    )
    return res.data
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, 'collection'>,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call(
      'com.atproto.repo.deleteRecord',
      undefined,
      { collection: 'pub.layers.segmentation.segmentation', ...params },
      { headers },
    )
  }
}
