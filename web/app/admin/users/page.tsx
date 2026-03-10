'use client';

/**
 * Admin user management page with search, role badges, and role assignment.
 *
 * @module
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight, Search, ShieldCheck, X } from 'lucide-react';

import {
  useAdminUsers,
  useAdminUserDetail,
  useAssignRole,
  useRevokeRole,
} from '@/lib/hooks/use-admin';
import type { AdminUser } from '@/lib/hooks/use-admin';
import { formatRelativeTime } from '@/lib/utils/format';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// =============================================================================
// AVAILABLE ROLES
// =============================================================================

const AVAILABLE_ROLES = [
  'viewer',
  'annotator',
  'adjudicator',
  'corpus-manager',
  'ontology-editor',
  'admin',
] as const;

// =============================================================================
// USER DETAIL PANEL
// =============================================================================

interface UserDetailProps {
  readonly did: string;
}

function UserDetailPanel({ did }: UserDetailProps): React.JSX.Element {
  const { data, isLoading } = useAdminUserDetail(did);
  const assignMutation = useAssignRole();
  const revokeMutation = useRevokeRole();
  const [selectedRole, setSelectedRole] = useState<string>('');

  if (isLoading || !data) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
    );
  }

  const availableToAssign = AVAILABLE_ROLES.filter((r) => !data.roles.includes(r));

  return (
    <div className="space-y-4 border-t bg-muted/30 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">DID</p>
          <code className="break-all text-xs">{data.did}</code>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Handle</p>
          <p className="text-sm">{data.handle}</p>
        </div>
      </div>

      {/* Current Roles */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Current Roles</p>
        <div className="flex flex-wrap gap-1.5">
          {data.roles.map((role) => (
            <Badge key={role} variant="secondary" className="gap-1">
              <ShieldCheck className="h-3 w-3" />
              {role}
              <button
                className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                onClick={() => revokeMutation.mutate({ did, role })}
              >
                <X className="h-2.5 w-2.5" />
                <span className="sr-only">Revoke {role}</span>
              </button>
            </Badge>
          ))}
          {data.roles.length === 0 ? (
            <span className="text-xs text-muted-foreground">No roles assigned</span>
          ) : null}
        </div>
      </div>

      {/* Assign Role */}
      {availableToAssign.length > 0 ? (
        <div className="flex items-center gap-2">
          <Select value={selectedRole} onValueChange={(val) => setSelectedRole(val ?? '')}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select role..." />
            </SelectTrigger>
            <SelectContent>
              {availableToAssign.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={!selectedRole || assignMutation.isPending}
            onClick={() => {
              if (selectedRole) {
                assignMutation.mutate({ did, role: selectedRole });
                setSelectedRole('');
              }
            }}
          >
            Assign
          </Button>
        </div>
      ) : null}

      {/* Record Counts */}
      {data.recordCounts && Object.keys(data.recordCounts).length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Record Counts</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
            {Object.entries(data.recordCounts).map(([type, count]) => (
              <div key={type} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{type}</span>
                <span className="font-mono">{count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

function UsersPage(): React.JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDid, setExpandedDid] = useState<string | null>(null);
  const { data: users, isLoading } = useAdminUsers(searchQuery);

  return (
    <div className="space-y-6">
      <PageHeader title="User Management" description="Search users and manage role assignments" />

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by handle or DID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !users || users.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {searchQuery.length < 2
                ? 'Enter at least 2 characters to search.'
                : 'No users found matching the query.'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Handle</TableHead>
                  <TableHead>DID</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Last Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user: AdminUser) => (
                  <>
                    <TableRow
                      key={user.did}
                      className="cursor-pointer"
                      onClick={() => setExpandedDid(expandedDid === user.did ? null : user.did)}
                    >
                      <TableCell className="w-8">
                        {expandedDid === user.did ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{user.handle}</TableCell>
                      <TableCell>
                        <code className="text-xs text-muted-foreground">
                          {user.did.slice(0, 24)}...
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((role) => (
                            <Badge key={role} variant="outline" className="text-[0.65rem]">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {user.lastActive ? formatRelativeTime(user.lastActive) : 'Unknown'}
                      </TableCell>
                    </TableRow>
                    {expandedDid === user.did ? (
                      <TableRow key={`${user.did}-detail`}>
                        <TableCell colSpan={5} className="p-0">
                          <UserDetailPanel did={user.did} />
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default UsersPage;
