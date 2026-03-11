/**
 * Storybook stories for the ExperimentEditor component.
 *
 * Uses an isolated story-only wrapper that renders the experiment
 * form structure without requiring auth, router, or API hooks.
 *
 * @module
 */

import type { Meta, StoryObj } from '@storybook/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { FlaskConical, Save } from 'lucide-react';

// =============================================================================
// Story-only wrapper (no auth/router dependencies)
// =============================================================================

function ExperimentEditorPreview({
  name,
  measureType,
  taskType,
  isLoading,
}: {
  readonly name?: string;
  readonly measureType?: string;
  readonly taskType?: string;
  readonly isLoading?: boolean;
}): React.JSX.Element {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[60%_40%]">
          <div className="space-y-4">
            <Skeleton className="h-64" />
            <Skeleton className="h-48" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FlaskConical className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold">
              {name ? 'Experiment Editor' : 'New Experiment'}
            </h2>
            <p className="text-sm text-muted-foreground">
              Configure experiment design, task, presentation, and recording parameters.
            </p>
          </div>
        </div>
        <Button size="sm">
          <Save className="mr-1.5 h-3.5 w-3.5" />
          Save
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input defaultValue={name ?? ''} placeholder="Experiment name" className="h-9" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Measure Type</Label>
              <Input
                defaultValue={measureType ?? ''}
                placeholder="Select measure"
                className="h-8"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Task Type</Label>
              <Input defaultValue={taskType ?? ''} placeholder="Select task" className="h-8" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {measureType && <Badge variant="secondary">{measureType}</Badge>}
            {taskType && <Badge variant="secondary">{taskType}</Badge>}
            {!measureType && !taskType && (
              <p className="text-xs text-muted-foreground">
                Configure the experiment to see a summary here.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// Meta
// =============================================================================

const meta = {
  title: 'Design/ExperimentEditor',
  component: ExperimentEditorPreview,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof ExperimentEditorPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

// =============================================================================
// Stories
// =============================================================================

export const Default: Story = {
  args: {},
};

export const WithData: Story = {
  args: {
    name: 'English Acceptability Magnitude Estimation',
    measureType: 'acceptability',
    taskType: 'magnitude-estimation',
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
  },
};

export const Empty: Story = {
  args: {
    name: '',
    measureType: '',
    taskType: '',
  },
};
