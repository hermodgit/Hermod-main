import React, { useState } from 'react';
import {
  LayoutDashboard,
  Wallet,
  Briefcase,
  ShieldAlert,
  CheckSquare,
  Activity,
  Cpu,
  Repeat,
  FileSearch,
  Code,
  Settings,
  ChevronLeft,
  ChevronRight,
  Power,
} from 'lucide-react';

export default function GhostProtocol() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  const navItems = [
    { name: 'DASHBOARD', icon: LayoutDashboard, active: true },
    { name: 'WALLETS', icon: Wallet, active: false },
    { name: 'PORTFOLIO', icon: Briefcase, active: false },
    { name: 'RISK', icon: ShieldAlert, active: false },
    { name: 'APPROVALS', icon: CheckSquare, active: false },
    { name: 'TRANSACTIONS', icon: Activity, active: false },
    { name: 'AGENTS', icon: Cpu, active: false },
    { name: 'RECURRING', icon: Repeat, active: false },
    { name: 'AUDIT', icon: FileSearch, active: false },
    { name: 'DEVELOPER', icon: Code, active: false },
    { name: 'SETTINGS', icon: Settings, active: false },
  ];

  const transactions = [
    { hash: '0x8f2a...9c1b', type: 'SWAP', amount: '45,000 USDC', chain: 'ETHEREUM', status: 'CONFIRMED', time: '14:23:01' },
    { hash: '0x3b19...4e2d', type: 'TRANSFER', amount: '12.5 ETH', chain: 'ARBITRUM', status: 'PENDING', time: '14:21:45' },
    { hash: '0x9a4f...7b8c', type: 'APPROVE', amount: 'UNLIMITED', chain: 'OPTIMISM', status: 'CONFIRMED', time: '13:59:12' },
    { hash: '0x1c2d...3e4f', type: 'DEPOSIT', amount: '100,000 USDT', chain: 'BASE', status: 'FAILED', time: '12:44:09' },
    { hash: '0x5e6f...7a8b', type: 'WITHDRAW', amount: '5.2 WBTC', chain: 'ETHEREUM', status: 'CONFIRMED', time: '10:15:33' },
  ];

  return (
    <div className="flex h-[100dvh] w-full bg-[#000000] text-[#00FF41] overflow-hidden selection:bg-[#00FF41] selection:text-black" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
        
        .scan-line-bg {
          background: repeating-linear-gradient(
            to bottom,
            transparent,
            transparent 2px,
            rgba(0, 255, 65, 0.05) 2px,
            rgba(0, 255, 65, 0.05) 4px
          );
        }
      `}</style>

      {/* Sidebar */}
      <div 
        className={`flex flex-col border-r border-[#00FF41]/30 transition-all duration-200 ease-in-out ${isSidebarOpen ? 'w-[220px]' : 'w-[48px]'} shrink-0 bg-[#000000]`}
      >
        {/* Logo Area */}
        <div className="h-[36px] flex items-center px-3 border-b border-[#00FF41]/20 scan-line-bg shrink-0 overflow-hidden">
          {isSidebarOpen ? (
            <div className="flex items-center text-[14px] font-bold tracking-[0.3em] uppercase whitespace-nowrap text-[#00FF41]">
              HERMD<span className="animate-[pulse_1s_infinite] ml-1">█</span>
            </div>
          ) : (
            <div className="flex items-center text-[14px] font-bold tracking-[0.1em] uppercase whitespace-nowrap text-[#00FF41] mx-auto">
              H<span className="animate-[pulse_1s_infinite]">█</span>
            </div>
          )}
        </div>

        {/* Nav Items */}
        <div className="flex-1 py-4 flex flex-col gap-1 overflow-hidden">
          {navItems.map((item, i) => (
            <button
              key={i}
              className={`flex items-center h-[32px] w-full px-3 text-left transition-colors whitespace-nowrap ${
                item.active 
                  ? 'border-l border-[#00FF41] bg-[#00FF41]/[0.08] text-[#00FF41]' 
                  : 'border-l border-transparent text-[#00FF41]/50 hover:text-[#00FF41] hover:bg-[#00FF41]/[0.05]'
              }`}
            >
              <item.icon size={14} className={`shrink-0 ${isSidebarOpen ? 'mr-3' : 'mx-auto'}`} strokeWidth={item.active ? 2.5 : 2} />
              {isSidebarOpen && <span className="text-[10px] uppercase font-bold">{item.name}</span>}
            </button>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="mt-auto flex flex-col w-full overflow-hidden">
          <div className="p-3 border-b border-t border-[#00FF41]/20 flex items-center justify-between whitespace-nowrap">
            {isSidebarOpen ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#00FF41] rounded-full animate-[pulse_2s_infinite]" />
                <span className="text-[10px] text-[#00FF41]/60 font-mono truncate w-[120px]">0x7F2a...9A2C</span>
              </div>
            ) : (
              <div className="mx-auto w-2 h-2 bg-[#00FF41] rounded-full animate-[pulse_2s_infinite]" />
            )}
          </div>
          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="h-[32px] flex items-center justify-center text-[#00FF41]/50 hover:text-[#00FF41] hover:bg-[#00FF41]/[0.05] transition-colors"
          >
            {isSidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#000000]">
        {/* Topbar */}
        <div className="h-[36px] flex items-center justify-between px-4 border-b border-[#00FF41]/20 scan-line-bg shrink-0">
          <div className="text-[10px] uppercase font-bold text-[#00FF41]">
            / DASHBOARD
          </div>
          <div className="flex items-center text-[10px] font-bold text-[#00FF41] animate-pulse gap-2">
            ● LIVE
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-[#00FF41]/60 font-mono">SYS.ADMIN // 0x7F2a...9A2C</span>
            <button className="text-[10px] text-[#00FF41]/60 hover:text-[#00FF41] underline underline-offset-2 flex items-center gap-1">
              <Power size={10} /> DISCONNECT
            </button>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <h1 className="text-[14px] font-bold uppercase mb-6 flex items-center gap-2 text-[#00FF41]">
            <Activity size={14} /> SYSTEM OVERVIEW
          </h1>

          {/* Stat Cards */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="border border-[#00FF41]/20 hover:border-[#00FF41] hover:bg-[#00FF41]/5 p-3 h-[72px] flex flex-col justify-between transition-colors cursor-default">
              <div className="text-[10px] text-[#00FF41]/60 uppercase font-bold">TOTAL PORTFOLIO VALUE</div>
              <div>
                <div className="text-[18px] font-bold text-[#00FF41] font-mono">$2,847,392.18</div>
                <div className="text-[10px] text-[#00FF41]">+$68,337.40 (24H)</div>
              </div>
            </div>
            
            <div className="border border-[#00FF41]/20 hover:border-[#00FF41] hover:bg-[#00FF41]/5 p-3 h-[72px] flex flex-col justify-between transition-colors cursor-default">
              <div className="text-[10px] text-[#00FF41]/60 uppercase font-bold">ACTIVE AGENTS</div>
              <div>
                <div className="text-[18px] font-bold text-[#00FF41] font-mono">12</div>
                <div className="text-[10px] text-[#00FF41]/60">ALL SYSTEMS NOMINAL</div>
              </div>
            </div>
            
            <div className="border border-[#00FF41]/20 hover:border-[#00FF41] hover:bg-[#00FF41]/5 p-3 h-[72px] flex flex-col justify-between transition-colors cursor-default">
              <div className="text-[10px] text-[#00FF41]/60 uppercase font-bold">PENDING TXNS</div>
              <div>
                <div className="text-[18px] font-bold text-[#00FF41] font-mono">3</div>
                <div className="text-[10px] text-[#00FF41]/60">AWAITING SIGNATURE</div>
              </div>
            </div>

            <div className="border border-[#00FF41]/20 hover:border-[#00FF41] hover:bg-[#00FF41]/5 p-3 h-[72px] flex flex-col justify-between transition-colors cursor-default">
              <div className="text-[10px] text-[#00FF41]/60 uppercase font-bold">RISK ALERTS</div>
              <div>
                <div className="text-[18px] font-bold text-[#ef4444] font-mono">1</div>
                <div className="text-[10px] text-[#ef4444]">HIGH SLIPPAGE DETECTED</div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="mb-4 text-[13px] font-bold uppercase border-b border-[#00FF41]/20 pb-2 flex items-center justify-between text-[#00FF41]">
            <span>RECENT TRANSACTIONS</span>
            <button className="text-[10px] text-[#00FF41]/60 hover:text-[#00FF41]">VIEW ALL /</button>
          </div>
          
          <div className="w-full">
            {/* Table Header */}
            <div className="flex w-full text-[10px] font-bold uppercase text-[#00FF41]/40 pb-2 border-b border-[#00FF41]/10">
              <div className="flex-[2]">HASH</div>
              <div className="flex-[1]">TYPE</div>
              <div className="flex-[2] text-right">AMOUNT</div>
              <div className="flex-[1.5] ml-6">CHAIN</div>
              <div className="flex-[1.5]">STATUS</div>
              <div className="flex-[1] text-right">TIME</div>
            </div>
            
            {/* Table Rows */}
            <div className="flex flex-col">
              {transactions.map((tx, i) => (
                <div 
                  key={i} 
                  className="flex w-full items-center h-[32px] text-[11px] border-b border-[#00FF41]/[0.06] hover:bg-[#00FF41]/[0.04] transition-colors cursor-pointer"
                >
                  <div className="flex-[2] font-mono text-[#00FF41]">{tx.hash}</div>
                  <div className="flex-[1] text-[#00FF41]/60">{tx.type}</div>
                  <div className="flex-[2] text-right font-mono text-[#00FF41]">{tx.amount}</div>
                  <div className="flex-[1.5] ml-6 text-[#00FF41]/60">{tx.chain}</div>
                  <div className="flex-[1.5] font-bold">
                    {tx.status === 'CONFIRMED' && <span className="text-[#00FF41]">● {tx.status}</span>}
                    {tx.status === 'PENDING' && <span className="text-[#eab308]">● {tx.status}</span>}
                    {tx.status === 'FAILED' && <span className="text-[#ef4444]">● {tx.status}</span>}
                  </div>
                  <div className="flex-[1] text-right text-[#00FF41]/60 font-mono">{tx.time}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}