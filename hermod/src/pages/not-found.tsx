import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="text-center">
        <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
        <h1 className="text-4xl font-bold text-foreground mb-2">404</h1>
        <p className="text-lg text-muted-foreground mb-6">Page not found</p>
        <Link href="/">
          <Button>Return Home</Button>
        </Link>
      </div>
    </div>
  );
}
