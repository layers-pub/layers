/**
 * `/about/registry` — public-facing page that documents the
 * canonical-content registry: the four-test rubric, the trigger
 * taxonomy, the proposal channels, and the current catalogue.
 *
 * Source of truth for the rubric text is `notes/pds.md#policy`;
 * keep this page in sync whenever the policy changes (the policy
 * document and this page are paired by convention, and a CI lint
 * checks for divergence in a follow-up).
 */

import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const RUBRIC = [
  {
    n: 1,
    title: 'Universal scope',
    body:
      'The record is meaningful to every Layers user as a reference, not bound to a specific lab, project, dataset, or community.',
    yes: 'Universal Dependencies POS',
    no: "One lab's house-style POS variant",
  },
  {
    n: 2,
    title: 'Stable identity',
    body:
      'Independent users want to reference the same AT-URI without coordinating. The content describes a thing the field already agrees on, or a vendored copy of an external thing the field agrees on.',
    yes: 'UD relations',
    no: 'An evolving in-progress annotation guideline',
  },
  {
    n: 3,
    title: 'Operator-authorable',
    body:
      'The appview operator can author or republish the record without speaking on behalf of any specific community.',
    yes: 'A published linguistic standard',
    no: 'A community guideline document attributed to a specific group',
  },
  {
    n: 4,
    title: 'Forkable',
    body:
      'The expected workflow when the canon does not fit is to fork into the user’s own PDS and specialise. The registry record is the parent of a fork tree.',
    yes: 'UD POS — users add language-specific subtypes',
    no: "A TOS document — it's prose, not data, and you don't fork it",
  },
] as const;

const TRIGGERS = [
  {
    label: 'Operator-initiated',
    body:
      'The appview operator authors a seed PR directly. Default for the v1 catalogue.',
  },
  {
    label: 'Standards-aligned',
    body:
      'A published linguistic standard cuts a new release (UD v3, UniMorph v3, FrameNet 2.0, …). Tracked via the glazing upstream cycle plus an annual review cadence. The new version lands in the existing account; previous versions stay at their fingerprint-keyed AT-URIs.',
  },
  {
    label: 'User-requested',
    body:
      'A user submits a proposal through one of the channels below. Operator scores against the four tests; accepts → seed PR lands; declines → response cites the failing test.',
  },
  {
    label: 'Adoption-promoted',
    body:
      'A community-authored resource with sustained fork traffic in the index gets invited into canon under attribution. The original author dual-publishes; the registry copy carries a parentRef back. v1 threshold: ≥50 distinct DIDs referencing the resource.',
  },
] as const;

const CATALOGUE = [
  {
    section: 'Authentication',
    accounts: ['auth.layers.pub'],
  },
  {
    section: 'Schemas (vendored)',
    accounts: ['foreign.layers.pub'],
  },
  {
    section: 'Established ontologies',
    accounts: [
      'ud.ontology.layers.pub',
      'ontonotes.ontology.layers.pub',
      'ptb-pos.ontology.layers.pub',
      'conceptnet.ontology.layers.pub',
      'goemotions.ontology.layers.pub',
      'plutchik.ontology.layers.pub',
      'ekman.ontology.layers.pub',
      'iso-timeml.ontology.layers.pub',
      'ucca.ontology.layers.pub',
    ],
  },
  {
    section: 'External lexical resources',
    accounts: [
      'propbank.ontology.layers.pub',
      'propbank.resource.layers.pub',
      'propbank.graph.layers.pub',
      'verbnet.ontology.layers.pub',
      'verbnet.resource.layers.pub',
      'verbnet.graph.layers.pub',
      'framenet.ontology.layers.pub',
      'framenet.resource.layers.pub',
      'framenet.graph.layers.pub',
      'pwn.eng.wordnet.ontology.layers.pub',
      'pwn.eng.wordnet.resource.layers.pub',
      'pwn.eng.wordnet.graph.layers.pub',
      'semlink.graph.layers.pub',
    ],
  },
  {
    section: 'Templates + experiments',
    accounts: ['paradigms.resource.layers.pub', 'paradigms.judgment.layers.pub'],
  },
  {
    section: 'Demo corpus',
    accounts: [
      'ewt.eng.ud.corpus.layers.pub',
      'ewt.eng.ud.expression.layers.pub',
      'ewt.eng.ud.segmentation.layers.pub',
      'ewt.eng.ud.annotation.layers.pub',
    ],
  },
  {
    section: 'UDS 2.0 (decomp.io)',
    accounts: [
      'ewt.eng.uds.corpus.layers.pub',
      'ewt.eng.uds.expression.layers.pub',
      'ewt.eng.uds.segmentation.layers.pub',
      'ewt.eng.uds.annotation.layers.pub',
      'ewt.eng.uds.graph.layers.pub',
    ],
  },
  {
    section: 'CHILDES (per-corpus)',
    accounts: [
      '<corpus>.<lang>.childes.corpus.layers.pub',
      '<corpus>.<lang>.childes.expression.layers.pub',
      '<corpus>.<lang>.childes.segmentation.layers.pub',
      '<corpus>.<lang>.childes.annotation.layers.pub',
      '<corpus>.<lang>.childes.persona.layers.pub',
    ],
  },
  {
    section: 'AMR (Abstract Meaning Representation)',
    accounts: [
      '<release>.eng.amr.corpus.layers.pub',
      '<release>.eng.amr.expression.layers.pub',
      '<release>.eng.amr.annotation.layers.pub',
      '<release>.eng.amr.graph.layers.pub',
    ],
  },
  {
    section: 'UCCA (per distribution)',
    accounts: [
      '<distribution>.<lang>.ucca.corpus.layers.pub',
      '<distribution>.<lang>.ucca.expression.layers.pub',
      '<distribution>.<lang>.ucca.segmentation.layers.pub',
      '<distribution>.<lang>.ucca.annotation.layers.pub',
      '<distribution>.<lang>.ucca.graph.layers.pub',
    ],
  },
  {
    section: 'PMB (Parallel Meaning Bank, per release/tier/lang)',
    accounts: [
      '<release>-<tier>.<lang>.pmb.corpus.layers.pub',
      '<release>-<tier>.<lang>.pmb.expression.layers.pub',
      '<release>-<tier>.<lang>.pmb.segmentation.layers.pub',
      '<release>-<tier>.<lang>.pmb.annotation.layers.pub',
      '<release>-<tier>.<lang>.pmb.graph.layers.pub',
    ],
  },
  {
    section: 'UMR (Uniform Meaning Representation, per release/lang)',
    accounts: [
      '<release>.<lang>.umr.corpus.layers.pub',
      '<release>.<lang>.umr.expression.layers.pub',
      '<release>.<lang>.umr.annotation.layers.pub',
      '<release>.<lang>.umr.graph.layers.pub',
    ],
  },
  {
    section: 'Operator',
    accounts: ['operator.changelog.layers.pub'],
  },
] as const;

const PROPOSAL_TEMPLATE_URL =
  'https://github.com/aaronstevenwhite/layers/issues/new?template=registry-proposal.yml&labels=registry-proposal';

export default function RegistryAboutPage(): React.JSX.Element {
  return (
    <main className="container mx-auto max-w-4xl px-4 pb-24 pt-6 md:pb-6">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">The Layers registry</h1>
        <p className="mt-2 text-muted-foreground">
          Canonical content the appview operator publishes alongside the index:
          ontologies, lexicons, paradigm templates, vendored standards, the demo
          corpus. Everything here passes the four-test rubric; everything else
          lives in users&apos; own PDSes.
        </p>
      </header>

      <section id="rubric" className="mb-10">
        <h2 className="mb-3 text-xl font-semibold tracking-tight">The four tests</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          A record belongs on the registry iff every test below answers yes.
          Each is decided independently; one failure is enough to disqualify.
        </p>
        <ol className="grid gap-3 md:grid-cols-2">
          {RUBRIC.map((r) => (
            <li key={r.n}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-mono">
                      {r.n}
                    </span>
                    {r.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="mb-3 text-sm">{r.body}</p>
                  <p className="text-xs">
                    <span className="font-medium text-emerald-700 dark:text-emerald-400">
                      Yes:
                    </span>{' '}
                    {r.yes}
                  </p>
                  <p className="text-xs">
                    <span className="font-medium text-rose-700 dark:text-rose-400">
                      No:
                    </span>{' '}
                    {r.no}
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section id="triggers" className="mb-10">
        <h2 className="mb-3 text-xl font-semibold tracking-tight">
          How content gets in
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Four trigger paths. No other route admitted; if a proposal does not
          match a trigger, it routes to the user&apos;s own PDS instead.
        </p>
        <ul className="grid gap-3 md:grid-cols-2">
          {TRIGGERS.map((t) => (
            <li key={t.label}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{t.label}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-sm text-muted-foreground">
                  {t.body}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section id="propose" className="mb-10">
        <h2 className="mb-3 text-xl font-semibold tracking-tight">
          Propose an addition
        </h2>
        <Card>
          <CardContent className="pt-6">
            <p className="mb-4 text-sm">
              v1 channel is the GitHub issue template. Fill in the canonical
              source, license, target subaccount, and per-test rubric scoring.
              Operator triages weekly; accepted proposals open a seed PR. v2
              channel is an in-app `pub.layers.registry.proposal` record;
              tracked separately.
            </p>
            <a
              href={PROPOSAL_TEMPLATE_URL}
              className="tap-target inline-flex items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              rel="noreferrer"
              target="_blank"
            >
              Open a registry proposal
            </a>
            <p className="mt-3 text-xs text-muted-foreground">
              Versions are never separate accounts. Bumping UD POS v3 lands in
              the existing `ud.ontology.layers.pub` alongside v1 and v2.
            </p>
          </CardContent>
        </Card>
      </section>

      <section id="catalogue">
        <h2 className="mb-3 text-xl font-semibold tracking-tight">
          Current catalogue
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Subaccount handles follow{' '}
          <code className="font-mono">{`<record-set>.<namespace>.layers.pub`}</code>;
          the namespace mirrors a directory under{' '}
          <code className="font-mono">lexicons/pub/layers/</code>. Browse the
          live catalogue at{' '}
          <Link href="/lenses" className="underline">
            /lenses
          </Link>{' '}
          (cross-app interop) and{' '}
          <Link href="/discover" className="underline">
            /discover
          </Link>{' '}
          (every namespace).
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {CATALOGUE.map((group) => (
            <Card key={group.section}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {group.section}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-1 text-xs font-mono">
                  {group.accounts.map((a) => (
                    <li key={a}>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {a}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
