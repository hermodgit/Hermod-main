import { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { truncateAddress, copyToClipboard } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface AddressDisplayProps {
  address: string;
  chainId?: number;
  truncate?: boolean;
  showCopy?: boolean;
  showExplorer?: boolean;
  className?: string;
}

export function AddressDisplay({ 
  address, 
  chainId = 1, 
  truncate = true, 
  showCopy = true, 
  showExplorer = false,
  className = '' 
}: AddressDisplayProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const displayAddress = truncate ? truncateAddress(address) : address;

  const handleCopy = async () => {
    try {
      await copyToClipboard(address);
      setCopied(true);
      toast({
        title: 'Copied to clipboard',
        description: 'Address copied successfully',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy address to clipboard',
        variant: 'destructive',
      });
    }
  };

  const getExplorerUrl = () => {
    const baseUrls: Record<number, string> = {
      1: 'https://etherscan.io',
      137: 'https://polygonscan.com',
      10: 'https://optimistic.etherscan.io',
      42161: 'https://arbiscan.io',
      8453: 'https://basescan.org',
      11155111: 'https://sepolia.etherscan.io',
    };
    const baseUrl = baseUrls[chainId] || baseUrls[1];
    return `${baseUrl}/address/${address}`;
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <code className="font-mono text-sm text-foreground">{displayAddress}</code>
      {showCopy && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6" 
          onClick={handleCopy}
          data-testid="button-copy-address"
        >
          {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
        </Button>
      )}
      {showExplorer && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          asChild
          data-testid="button-view-explorer"
        >
          <a href={getExplorerUrl()} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3 w-3" />
          </a>
        </Button>
      )}
    </div>
  );
}
