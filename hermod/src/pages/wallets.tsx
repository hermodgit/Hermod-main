import { useState } from 'react';
import { Layout } from '@/components/layout/layout';
import { AddressDisplay } from '@/components/shared/address-display';
import { Button } from '@/components/ui/button';
import { useListWallets, useDeleteWallet, useSaveWallet, getListWalletsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { WalletButton } from '@/components/shared/wallet-button';
import { Trash2, Wallet as WalletIcon, Plus } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Wallets() {
  const { data: wallets, isLoading } = useListWallets();
  const deleteWallet = useDeleteWallet();
  const saveWallet = useSaveWallet();
  const queryClient = useQueryClient();
  const { address, chainId } = useAccount();
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleConnectAndSave = async () => {
    if (!address || !chainId) {
      toast({
        title: 'No wallet connected',
        description: 'Please connect a wallet using the button above',
        variant: 'destructive',
      });
      return;
    }

    const existingWallet = wallets?.find(w => w.address.toLowerCase() === address.toLowerCase());
    if (existingWallet) {
      toast({
        title: 'Wallet already connected',
        description: 'This wallet address is already saved',
      });
      return;
    }

    saveWallet.mutate(
      { data: { address, chainId, chainName: `Chain ${chainId}` } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListWalletsQueryKey() });
          toast({
            title: 'Wallet saved',
            description: 'Your wallet has been successfully connected',
          });
        },
        onError: (error: any) => {
          toast({
            title: 'Failed to save wallet',
            description: error.message || 'An error occurred',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handleDelete = (id: string) => {
    deleteWallet.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListWalletsQueryKey() });
          toast({
            title: 'Wallet disconnected',
            description: 'Wallet has been removed from your account',
          });
          setDeleteId(null);
        },
        onError: (error: any) => {
          toast({
            title: 'Failed to disconnect wallet',
            description: error.message || 'An error occurred',
            variant: 'destructive',
          });
        },
      }
    );
  };

  return (
    <Layout title="Wallets">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Connected Wallets</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage wallet addresses connected to your account
            </p>
          </div>
          <div className="flex items-center gap-3">
            <WalletButton />
            <Button onClick={handleConnectAndSave} disabled={!address || saveWallet.isPending} data-testid="button-save-wallet">
              <Plus className="mr-2 h-4 w-4" />
              {saveWallet.isPending ? 'Saving...' : 'Save Connected Wallet'}
            </Button>
          </div>
        </div>

        {/* Wallets Table */}
        <div className="bg-card border border-card-border rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-4">Loading wallets...</p>
            </div>
          ) : !wallets || wallets.length === 0 ? (
            <div className="p-12 text-center">
              <WalletIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No wallets connected</p>
              <p className="text-xs text-muted-foreground mt-1">
                Connect a wallet using RainbowKit and click "Save Connected Wallet"
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-card-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Chain
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Label
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Connected Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {wallets.map((wallet) => (
                  <tr key={wallet.id} className="hover:bg-muted/30 transition-colors" data-testid={`wallet-${wallet.id}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <AddressDisplay address={wallet.address} chainId={wallet.chainId} showExplorer />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary">
                        {wallet.chainName || `Chain ${wallet.chainId}`}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {wallet.label || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {formatDate(wallet.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(wallet.id)}
                        data-testid={`button-delete-${wallet.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Wallet</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect this wallet? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
