import { useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { config as wagmiConfig } from './lib/wagmi';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Redirect, Router as WouterRouter, useLocation } from 'wouter';

// Pages
import Home from '@/pages/home';
import Dashboard from '@/pages/dashboard';
import Wallets from '@/pages/wallets';
import Portfolio from '@/pages/portfolio';
import Risk from '@/pages/risk';
import Approvals from '@/pages/approvals';
import Transactions from '@/pages/transactions';
import TransactionDetail from '@/pages/transaction-detail';
import Agents from '@/pages/agents';
import AgentDetail from '@/pages/agent-detail';
import Recurring from '@/pages/recurring';
import Audit from '@/pages/audit';
import Developer from '@/pages/developer';
import Settings from '@/pages/settings';
import Transfer from '@/pages/transfer';
import SwapPage from '@/pages/swap';
import AIAssistant from '@/pages/ai-assistant';
import Whitepaper from '@/pages/whitepaper';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// Resolve the publishable key: publishableKeyFromHost handles Replit proxy
// domains; fall back to the raw env var so production never silently black-screens.
const clerkPubKey =
  publishableKeyFromHost(
    window.location.hostname,
    import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
  ) ?? import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Proxy URL: use explicit env var override, or auto-compute in production so
// Clerk API calls are routed through our domain (required for .replit.app).
// In development the proxy middleware is a no-op so we omit the URL there.
const clerkProxyUrl: string | undefined =
  import.meta.env.VITE_CLERK_PROXY_URL ||
  (import.meta.env.PROD
    ? `${window.location.origin}/api/__clerk`
    : undefined);

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY');
}

// Clerk appearance — Neural Grid cyberpunk palette
const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.png`,
  },
  variables: {
    colorPrimary: 'hsl(112 100% 54%)',        // #39FF14 electric lime
    colorForeground: 'hsl(0 0% 91%)',         // #E8E8E8
    colorMutedForeground: 'hsl(0 0% 45%)',
    colorDanger: 'hsl(0 100% 63%)',           // #FF4444
    colorBackground: 'hsl(0 0% 5%)',          // #0D0D0D
    colorInput: 'hsl(0 0% 8%)',
    colorInputForeground: 'hsl(0 0% 91%)',
    colorNeutral: 'hsl(0 0% 10%)',
    fontFamily: 'Inter, sans-serif',
    borderRadius: '0.125rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'w-[420px] max-w-full overflow-hidden',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'font-bold tracking-tight',
    socialButtonsBlockButton: '!bg-[hsl(0_0%_8%)] !border-[hsl(0_0%_14%)] !text-[hsl(0_0%_80%)]',
    formButtonPrimary: '!bg-[hsl(112_100%_54%)] !text-[hsl(0_0%_3%)] !font-semibold hover:!bg-[hsl(112_100%_46%)]',
    formFieldInput: '!bg-[hsl(0_0%_7%)] !border-[hsl(0_0%_14%)] !text-[hsl(0_0%_91%)] focus:!border-[hsl(112_100%_54%)]',
    footerActionLink: '!text-[hsl(112_100%_54%)] hover:!text-[hsl(112_100%_64%)]',
    footerAction: 'flex items-center justify-center gap-1',
    dividerLine: '!bg-[hsl(0_0%_12%)]',
    alert: '!bg-[hsl(0_100%_63%_/_0.08)] !border-[hsl(0_100%_63%_/_0.25)]',
    otpCodeFieldInput: '!bg-[hsl(0_0%_7%)] !border-[hsl(0_0%_14%)] !text-[hsl(0_0%_91%)]',
    main: 'gap-5',
  },
};

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <Home />
      </Show>
    </>
  );
}

// Invalidate QueryClient cache when user changes
function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in/*?" component={() => (
        <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
          <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
        </div>
      )} />
      <Route path="/sign-up/*?" component={() => (
        <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
          <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
        </div>
      )} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/wallets" component={Wallets} />
      <Route path="/portfolio" component={Portfolio} />
      <Route path="/risk" component={Risk} />
      <Route path="/approvals" component={Approvals} />
      <Route path="/transactions/:id" component={TransactionDetail} />
      <Route path="/transactions" component={Transactions} />
      <Route path="/agents/:id" component={AgentDetail} />
      <Route path="/agents" component={Agents} />
      <Route path="/recurring" component={Recurring} />
      <Route path="/audit" component={Audit} />
      <Route path="/developer" component={Developer} />
      <Route path="/settings" component={Settings} />
      <Route path="/transfer" component={Transfer} />
      <Route path="/swap" component={SwapPage} />
      <Route path="/ai-agent" component={AIAssistant} />
      <Route path="/whitepaper" component={Whitepaper} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: 'Welcome to Hermod',
            subtitle: 'Sign in to access your financial agent console',
          },
        },
        signUp: {
          start: {
            title: 'Create Account',
            subtitle: 'Get started with Hermod',
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider>
            <ClerkQueryClientCacheInvalidator />
            <TooltipProvider>
              <Router />
              <Toaster />
            </TooltipProvider>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
