'use client';

/**
 * Collapsible tree view for ontology type definitions.
 *
 * @module
 */

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTypeDefsByOntology } from '@/lib/hooks';
import type { TypeDef } from '@/lib/hooks/use-type-defs';

/**
 * Shape of a single typeDef node for display in the tree.
 */
interface TypeDefNode {
  uri: string;
  label: string;
  description?: string;
  children: TypeDefNode[];
}

interface TypeDefTreeProps {
  readonly ontologyUri: string;
}

/**
 * Transforms a flat list of typeDefs (with parentUri fields) into a tree.
 *
 * Roots are typeDefs where parentUri is undefined or null. Children are sorted
 * alphabetically by label within each parent.
 */
function buildTypeDefTree(typeDefs: TypeDef[]): TypeDefNode[] {
  const nodeMap = new Map<string, TypeDefNode>();

  for (const td of typeDefs) {
    nodeMap.set(td.uri, {
      uri: td.uri,
      label: td.value.name,
      description: td.value.gloss,
      children: [],
    });
  }

  const roots: TypeDefNode[] = [];

  for (const td of typeDefs) {
    const node = nodeMap.get(td.uri);
    if (!node) continue;

    if (td.value.parentTypeRef) {
      const parent = nodeMap.get(td.value.parentTypeRef);
      if (parent) {
        parent.children.push(node);
      } else {
        // Parent not in this ontology; treat as root
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  const sortByLabel = (a: TypeDefNode, b: TypeDefNode): number => a.label.localeCompare(b.label);

  function sortChildren(node: TypeDefNode): void {
    node.children.sort(sortByLabel);
    for (const child of node.children) {
      sortChildren(child);
    }
  }

  roots.sort(sortByLabel);
  for (const root of roots) {
    sortChildren(root);
  }

  return roots;
}

/**
 * Renders a single typeDef node with expand/collapse behavior.
 */
function TypeDefNodeView({ node }: { readonly node: TypeDefNode }): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = node.children.length > 0;

  if (!hasChildren) {
    return (
      <div className="flex items-center gap-1.5 py-1 pl-5">
        <TypeDefLabel label={node.label} description={node.description} />
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-1.5 py-1 text-left hover:bg-muted/50 rounded px-1 -ml-1">
        {isOpen ? (
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        <TypeDefLabel label={node.label} description={node.description} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-4 border-l border-border pl-2">
          {node.children.map((child) => (
            <TypeDefNodeView key={child.uri} node={child} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * Label with an optional tooltip showing the typeDef description.
 */
function TypeDefLabel({
  label,
  description,
}: {
  readonly label: string;
  readonly description?: string;
}): React.JSX.Element {
  if (!description) {
    return <span className="text-sm">{label}</span>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="text-sm cursor-default underline decoration-dotted underline-offset-4 decoration-muted-foreground/50">
          {label}
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <p className="text-xs">{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Renders ontology typeDefs as a collapsible tree.
 *
 * Each node shows its label, with an expand/collapse chevron for nodes
 * that have children. Descriptions are shown on hover via a tooltip.
 */
function TypeDefTree({ ontologyUri }: TypeDefTreeProps): React.JSX.Element {
  const { data, isLoading, error } = useTypeDefsByOntology(ontologyUri);
  const nodes = useMemo(() => buildTypeDefTree(data?.records ?? []), [data?.records]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="size-3.5" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">Failed to load type definitions.</p>;
  }

  if (nodes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No type definitions have been added to this ontology yet.
      </p>
    );
  }

  return (
    <div className="space-y-0.5">
      {nodes.map((node) => (
        <TypeDefNodeView key={node.uri} node={node} />
      ))}
    </div>
  );
}

export type { TypeDefNode, TypeDefTreeProps };
export { TypeDefTree };
