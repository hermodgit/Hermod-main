import { useState, Fragment } from 'react';
import { Layout } from '@/components/layout/layout';
import { AddressDisplay } from '@/components/shared/address-display';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useListAuditLogs, getListAuditLogsQueryKey } from '@workspace/api-client-react';
import { ChevronDown, ChevronUp, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function Audit() {
  const [eventTypeInput, setEventTypeInput] = useState('');
  const [walletAddressInput, setWalletAddressInput] = useState('');
  const [statusInput, setStatusInput] = useState('all');

  const [filters, setFilters] = useState({ eventType: '', walletAddress: '', status: '' });
  const [page, setPage] = useState(0);
  const limit = 50;
  const offset = page * limit;

  const queryParams = { 
    limit, 
    offset, 
    ...(filters.eventType ? { eventType: filters.eventType } : {}),
    ...(filters.walletAddress ? { walletAddress: filters.walletAddress } : {}),
    ...(filters.status ? { status: filters.status } : {})
  };

  const { data, isLoading } = useListAuditLogs(queryParams, {
    query: { queryKey: getListAuditLogsQueryKey(queryParams) }
  });

  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const applyFilters = () => {
    setFilters({
      eventType: eventTypeInput,
      walletAddress: walletAddressInput,
      status: statusInput === 'all' ? '' : statusInput,
    });
    setPage(0);
    setExpandedRows({});
  };

  const clearFilters = () => {
    setEventTypeInput('');
    setWalletAddressInput('');
    setStatusInput('all');
    setFilters({ eventType: '', walletAddress: '', status: '' });
    setPage(0);
    setExpandedRows({});
  };

  const toggleRow = (id: string) => setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));

  const getEventColor = (type: string) => {
    if (type.includes('passed')) return 'bg-green-500/10 text-green-500 border-green-500/20';
    if (type.includes('failed')) return 'bg-red-500/10 text-red-500 border-red-500/20';
    if (type.includes('analyzed')) return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    if (type.includes('risk')) return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    if (type.includes('revoked')) return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    if (type.includes('intent')) return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    return 'bg-muted text-muted-foreground';
  };

  const getStatusColor = (status: string | null | undefined) => {
    if (status === 'success') return 'bg-green-500/10 text-green-500 border-green-500/20';
    if (status === 'failed') return 'bg-red-500/10 text-red-500 border-red-500/20';
    if (status === 'blocked') return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    return 'bg-muted text-muted-foreground';
  };

  const total = data?.total || 0;
  const items = data?.items || [];
  const maxPage = Math.max(0, Math.ceil(total / limit) - 1);

  return (
    <Layout title="Audit Trail">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Audit Log</h2>
            <p className="text-sm text-muted-foreground mt-1">Immutable record of all agent activities and system events</p>
          </div>
        </div>

        <div className="bg-card border border-card-border rounded-lg p-4 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground uppercase mb-1 block">Event Type</label>
            <Input value={eventTypeInput} onChange={e => setEventTypeInput(e.target.value)} placeholder="policy_check_passed..." onKeyDown={e => e.key === 'Enter' && applyFilters()} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground uppercase mb-1 block">Wallet Address</label>
            <Input value={walletAddressInput} onChange={e => setWalletAddressInput(e.target.value)} placeholder="0x..." className="font-mono" onKeyDown={e => e.key === 'Enter' && applyFilters()} />
          </div>
          <div className="w-[150px]">
            <label className="text-xs text-muted-foreground uppercase mb-1 block">Status</label>
            <Select value={statusInput} onValueChange={setStatusInput}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="secondary" onClick={applyFilters}>Filter</Button>
          <Button variant="ghost" onClick={clearFilters}>Clear</Button>
        </div>

        <div className="bg-card border border-card-border rounded-lg overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-card-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase w-10"></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase whitespace-nowrap">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Event</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Wallet</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Agent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Tx Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {isLoading ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-muted-foreground"><Shield className="w-8 h-8 animate-pulse mx-auto mb-2" />Loading logs...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">No audit logs found matching filters.</td></tr>
                ) : (
                  items.map(log => (
                    <Fragment key={log.id}>
                      <tr className="hover:bg-muted/30 cursor-pointer" onClick={() => toggleRow(log.id)}>
                        <td className="px-6 py-4 text-muted-foreground">
                          {expandedRows[log.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-muted-foreground whitespace-nowrap">{formatDate(log.createdAt)}</td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className={getEventColor(log.eventType)}>{log.eventType}</Badge>
                        </td>
                        <td className="px-6 py-4">
                          {log.walletAddress ? <AddressDisplay address={log.walletAddress} showCopy={false} /> : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                          {log.agentId ? log.agentId.slice(0,8) : '—'}
                        </td>
                        <td className="px-6 py-4">
                          {log.status ? <Badge variant="outline" className={`capitalize ${getStatusColor(log.status)}`}>{log.status}</Badge> : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-6 py-4">
                          {log.transactionHash ? <AddressDisplay address={log.transactionHash} showExplorer showCopy /> : <span className="text-muted-foreground">—</span>}
                        </td>
                      </tr>
                      {expandedRows[log.id] && (
                        <tr className="bg-muted/10">
                          <td colSpan={7} className="px-12 py-4">
                            <div className="bg-[#0f1115] border border-card-border rounded-md p-4 overflow-x-auto">
                              <pre className="text-xs font-mono text-green-400/80">
                                {JSON.stringify(log.eventData || { message: "No additional data" }, null, 2)}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {total > 0 && (
            <div className="p-4 border-t border-card-border flex items-center justify-between bg-muted/20">
              <div className="text-sm text-muted-foreground">
                Showing {offset + 1}-{Math.min(offset + limit, total)} of {total} entries
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(maxPage, p + 1))} disabled={page >= maxPage}>
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
