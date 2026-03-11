/**
 * Storybook stories for ProjectCard from the design dashboard.
 *
 * @module
 */

import type { Meta, StoryObj } from '@storybook/react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Languages, BookOpen } from 'lucide-react';

// =============================================================================
// Inline ProjectCard for story isolation (avoids auth/hook dependencies)
// =============================================================================

function ProjectCardStory({
  name,
  description,
  language,
}: {
  readonly name: string;
  readonly description?: string;
  readonly language?: string;
}): React.JSX.Element {
  return (
    <Card className="h-full transition-colors hover:bg-muted/30">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold leading-tight">{name}</CardTitle>
          {language ? (
            <Badge variant="outline" className="shrink-0">
              <Languages className="mr-1 size-3" />
              {language}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {description || 'No description'}
        </p>
        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <BookOpen className="size-3" />
            Lexicons
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectCardSkeletonStory(): React.JSX.Element {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-3/4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="mt-1.5 h-4 w-2/3" />
        <Skeleton className="mt-3 h-3 w-1/3" />
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Meta
// =============================================================================

const meta = {
  title: 'Design/ProjectCard',
  component: ProjectCardStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProjectCardStory>;

export default meta;
type Story = StoryObj<typeof meta>;

// =============================================================================
// Stories
// =============================================================================

export const Default: Story = {
  args: {
    name: 'English Acceptability',
    description: 'Lexicon and experiment design for English acceptability judgments.',
    language: 'en',
  },
};

export const NoDescription: Story = {
  args: {
    name: 'Unnamed Project',
  },
};

export const LongDescription: Story = {
  args: {
    name: 'Multilingual Valency Lexicon',
    description:
      'A comprehensive resource collecting valency frames across 12 languages with templates for forced-choice and magnitude estimation experiments. Includes constraints for balanced sampling across verb classes.',
    language: 'mul',
  },
};

export const Loading: Story = {
  render: () => <ProjectCardSkeletonStory />,
};

export const Empty: Story = {
  args: {
    name: 'New Project',
    description: '',
  },
};
