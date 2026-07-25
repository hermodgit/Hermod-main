import React, { useState } from 'react';
import { 
  Hexagon, LayoutDashboard, Wallet, PieChart, ShieldAlert, CheckSquare, 
  ArrowRightLeft, Bot, RefreshCw, ClipboardList, Code, Settings,
  ArrowLeftRight, Bell, Circle, TrendingUp, AlertTriangle, Clock
} from 'lucide-react';

export default function NeonVoid() {
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', active: true },
    { icon: Wallet, label: 'Wallets' },
    { icon: PieChart, label: 'Portfolio' },
    { icon: ShieldAlert, label: 'Risk' },
    { icon: CheckSquare, label: 'Approvals' },
    { icon: ArrowRightLeft, label: 'Transactions' },
    { icon: Bot, label: 'Agents' },
    { icon: RefreshCw, label: 'Recurring' },
    { icon: ClipboardList, label: 'Audit' },
    { icon: Code, label: 'Developer' },
    { icon: Settings, label: 'Settings' },
  ];

  const transactions = [
    { hash: '0x8f3c...9a21', type: 'SWAP', amount: '+ 42.5 ETH', chain: 'Ethereum', status: 'CONFIRMED', time: '2 mins ago', positive: true },
    { hash: '0x1a9b...4c7e', type: 'APPROVE', amount: '0.00 USDC', chain: 'Polygon', status: 'CONFIRMED', time: '14 mins ago', positive: false },
    { hash: '0x77d2...3f99', type: 'EXECUTE', amount: '- 12,500 USDC', chain: 'Arbitrum', status: 'PENDING', time: '1 hr ago', positive: false },
    { hash: '0x99e1...11a0', type: 'DEPOSIT', amount: '+ 1.2 BTC', chain: 'Bitcoin', status: 'CONFIRMED', time: '3 hrs ago', positive: true },
    { hash: '0x4f2a...8d55', type: 'WITHDRAW', amount: '- 500 SOL', chain: 'Solana', status: 'FAILED', time: '5 hrs ago', positive: false },
  ];

  return (
    <div className="flex h-screen w-full bg-[#000000] text-white overflow-hidden relative selection:bg-[rgba(15,255,80,0.3)] selection:text-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Syne:wght@400;600;700&display=swap');
        
        .font-syne { font-family: 'Syne', system-ui, sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        
        .glass-panel {
          background: rgba(15, 255, 80, 0.03);
          border: 1px solid rgba(15, 255, 80, 0.12);
          border-radius: 4px;
          transition: all 0.3s ease;
        }
        .glass-panel:hover {
          box-shadow: 0 0 20px rgba(15, 255, 80, 0.08);
          border-color: rgba(15, 255, 80, 0.25);
        }
        
        .sidebar-active {
          background: linear-gradient(90deg, rgba(15, 255, 80, 0.15) 0%, transparent 100%);
        }
        
        .text-glow {
          text-shadow: 0 0 20px rgba(15, 255, 80, 0.4);
        }
        
        .sidebar-transition {
          transition: width 250ms ease;
        }
        
        /* Webkit scrollbar for dark theme */
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(15, 255, 80, 0.15); border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(15, 255, 80, 0.3); }
      `}</style>
      
      {/* Sidebar */}
      <div 
        className={`relative flex flex-col bg-[rgba(0,0,0,0.95)] border-r border-[rgba(15,255,80,0.15)] sidebar-transition z-20 ${collapsed ? 'w-[52px]' : 'w-[220px]'}`}
      >
        {/* Toggle Button */}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-12 w-6 h-6 rounded-full bg-black border border-[rgba(15,255,80,0.3)] flex items-center justify-center text-[rgba(15,255,80,0.8)] hover:text-[#0FFF50] hover:border-[#0FFF50] hover:shadow-[0_0_10px_rgba(15,255,80,0.2)] z-30 transition-all cursor-pointer"
        >
          <ArrowLeftRight size={10} />
        </button>

        {/* Logo Area */}
        <div className="h-[44px] flex items-center px-4 border-b border-[rgba(15,255,80,0.1)] shrink-0 overflow-hidden">
          <Hexagon size={16} className="text-[#0FFF50] shrink-0" />
          {!collapsed && (
            <span className="font-syne text-[12px] font-bold tracking-[0.2em] ml-3 text-[#0FFF50]">
              HERMOD
            </span>
          )}
        </div>

        {/* Nav Items */}
        <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-1">
          {navItems.map((item, i) => (
            <div 
              key={i}
              className={`h-[38px] flex items-center px-4 cursor-pointer relative group transition-colors ${
                item.active 
                  ? 'sidebar-active text-[#0FFF50]' 
                  : 'text-[rgba(255,255,255,0.35)] hover:text-[rgba(255,255,255,0.6)] hover:bg-[rgba(15,255,80,0.02)]'
              }`}
            >
              <item.icon 
                size={14} 
                className={`shrink-0 ${item.active ? 'text-[#0FFF50]' : 'text-[rgba(15,255,80,0.3)] group-hover:text-[rgba(15,255,80,0.6)]'} transition-colors`} 
              />
              
              {!collapsed && (
                <span className="font-syne text-[11px] ml-[8px] uppercase tracking-wider">
                  {item.label}
                </span>
              )}
              
              {collapsed && item.active && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#0FFF50]" />
              )}
            </div>
          ))}
        </div>

        {/* Bottom User Section */}
        <div className="h-[52px] border-t border-[rgba(15,255,80,0.1)] flex items-center px-4 shrink-0 overflow-hidden cursor-pointer hover:bg-[rgba(15,255,80,0.02)] transition-colors">
          <div className="w-6 h-6 rounded-full border border-[rgba(15,255,80,0.3)] flex items-center justify-center shrink-0 bg-[rgba(15,255,80,0.05)] relative">
            <Circle size={12} className="text-[#0FFF50]" />
            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#0FFF50] animate-pulse" />
          </div>
          {!collapsed && (
            <div className="ml-3 flex flex-col">
              <span className="font-mono text-[10px] text-[rgba(255,255,255,0.7)]">
                0x1234...5678
              </span>
              <span className="font-syne text-[8px] text-[rgba(15,255,80,0.6)] uppercase tracking-widest mt-0.5">
                Admin
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Topbar */}
        <div className="h-[44px] border-b border-[rgba(15,255,80,0.1)] flex items-center justify-between px-6 shrink-0 bg-[rgba(0,0,0,0.4)] backdrop-blur-sm z-10">
          <div className="flex items-center gap-2">
            <span className="font-syne text-[12px] tracking-[0.2em] font-bold text-white uppercase">DASHBOARD</span>
            <span className="text-[rgba(15,255,80,0.3)] font-syne">/</span>
            <span className="font-syne text-[10px] tracking-widest text-[rgba(255,255,255,0.4)] uppercase">Overview</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <span className="font-mono text-[9px] text-[rgba(15,255,80,0.8)] flex items-center gap-1.5 uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0FFF50] shadow-[0_0_5px_#0FFF50] animate-pulse" /> 
                API ONLINE
              </span>
              <span className="font-mono text-[9px] text-[rgba(15,255,80,0.8)] flex items-center gap-1.5 uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0FFF50] shadow-[0_0_5px_#0FFF50]" /> 
                CHAIN SYNC
              </span>
              <span className="font-mono text-[9px] text-[rgba(15,255,80,0.8)] flex items-center gap-1.5 uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0FFF50] shadow-[0_0_5px_#0FFF50]" /> 
                AI READY
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative text-[rgba(15,255,80,0.5)] hover:text-[#0FFF50] transition-colors cursor-pointer">
              <Bell size={14} />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#0FFF50] shadow-[0_0_5px_#0FFF50]" />
            </button>
            <div className="h-6 flex items-center px-3 rounded glass-panel cursor-pointer">
              <span className="font-mono text-[10px] text-[#0FFF50]">0x1234...5678</span>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 relative z-0">
          
          {/* Subtle background glow */}
          <div className="fixed top-[30%] left-[50%] w-[600px] h-[600px] bg-[#0FFF50] opacity-[0.02] blur-[120px] rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2" />
          
          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            
            <div className="glass-panel p-4 flex flex-col relative overflow-hidden group">
              <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[rgba(15,255,80,0.08)] flex items-center justify-center">
                <PieChart size={14} className="text-[#0FFF50]" />
              </div>
              <span className="font-syne text-[10px] uppercase tracking-[0.1em] text-[rgba(255,255,255,0.4)] mb-3">Total Portfolio Value</span>
              <span className="font-mono text-[20px] font-bold text-[#0FFF50] text-glow">$2,847,392.18</span>
              <div className="mt-3 flex items-center gap-1 font-mono text-[10px] text-[#0FFF50] bg-[rgba(15,255,80,0.1)] px-1.5 py-0.5 rounded w-fit">
                <TrendingUp size={10} /> +12.4%
              </div>
            </div>

            <div className="glass-panel p-4 flex flex-col relative overflow-hidden group">
              <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[rgba(15,255,80,0.08)] flex items-center justify-center">
                <Bot size={14} className="text-[#0FFF50]" />
              </div>
              <span className="font-syne text-[10px] uppercase tracking-[0.1em] text-[rgba(255,255,255,0.4)] mb-3">Active Agents</span>
              <span className="font-mono text-[20px] font-bold text-[#0FFF50] text-glow">12</span>
              <div className="mt-3 flex items-center gap-1 font-mono text-[10px] text-[rgba(255,255,255,0.5)]">
                3 idle, 9 processing
              </div>
            </div>

            <div className="glass-panel p-4 flex flex-col relative overflow-hidden group">
              <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[rgba(15,255,80,0.08)] flex items-center justify-center">
                <Clock size={14} className="text-[#0FFF50]" />
              </div>
              <span className="font-syne text-[10px] uppercase tracking-[0.1em] text-[rgba(255,255,255,0.4)] mb-3">Pending Txns</span>
              <span className="font-mono text-[20px] font-bold text-[#0FFF50] text-glow">3</span>
              <div className="mt-3 flex items-center gap-1 font-mono text-[10px] text-[#0FFF50]">
                Awaiting confirmation
              </div>
            </div>

            <div className="glass-panel p-4 flex flex-col relative overflow-hidden group">
              <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[rgba(15,255,80,0.08)] flex items-center justify-center">
                <ShieldAlert size={14} className="text-[#0FFF50]" />
              </div>
              <span className="font-syne text-[10px] uppercase tracking-[0.1em] text-[rgba(255,255,255,0.4)] mb-3">Risk Alerts</span>
              <span className="font-mono text-[20px] font-bold text-[#0FFF50] text-glow">1</span>
              <div className="mt-3 flex items-center gap-1 font-mono text-[10px] text-[#FF3366] bg-[rgba(255,51,102,0.1)] px-1.5 py-0.5 rounded w-fit">
                <AlertTriangle size={10} /> High Slippage
              </div>
            </div>

          </div>

          {/* Table Section */}
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex items-center gap-3 w-fit">
              <h2 className="font-syne text-[14px] uppercase tracking-[0.15em] font-bold text-white relative pb-1 border-b border-[#0FFF50]">
                RECENT TRANSACTIONS
              </h2>
            </div>
            
            <div className="glass-panel w-full flex flex-col">
              {/* Table Header */}
              <div className="grid grid-cols-6 px-4 py-2 border-b border-[rgba(15,255,80,0.1)] font-syne text-[9px] uppercase tracking-[0.12em] text-[rgba(255,255,255,0.3)]">
                <div className="col-span-1">Hash</div>
                <div className="col-span-1">Type</div>
                <div className="col-span-1">Amount</div>
                <div className="col-span-1">Chain</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-1 text-right">Time</div>
              </div>

              {/* Table Rows */}
              <div className="flex flex-col">
                {transactions.map((tx, i) => (
                  <div 
                    key={i} 
                    className="grid grid-cols-6 items-center px-4 h-[34px] border-b border-b-[rgba(15,255,80,0.05)] last:border-b-0 border-l border-l-transparent hover:bg-[rgba(15,255,80,0.03)] hover:border-l-[#0FFF50] transition-colors cursor-pointer font-mono text-[11px]"
                  >
                    <div className="col-span-1 text-[rgba(15,255,80,0.7)] truncate pr-4">{tx.hash}</div>
                    <div className="col-span-1 text-white">{tx.type}</div>
                    <div className={`col-span-1 ${tx.positive ? 'text-[#0FFF50]' : 'text-white'}`}>{tx.amount}</div>
                    <div className="col-span-1 text-[rgba(255,255,255,0.7)]">{tx.chain}</div>
                    <div className="col-span-1 flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full shadow-[0_0_5px_currentColor] ${tx.status === 'CONFIRMED' ? 'bg-[#0FFF50] text-[#0FFF50]' : tx.status === 'PENDING' ? 'bg-[#FFCC00] text-[#FFCC00]' : 'bg-[#FF3366] text-[#FF3366]'}`} />
                      <span className={`text-[10px] ${tx.status === 'CONFIRMED' ? 'text-[#0FFF50]' : tx.status === 'PENDING' ? 'text-[#FFCC00]' : 'text-[#FF3366]'}`}>{tx.status}</span>
                    </div>
                    <div className="col-span-1 text-right text-[rgba(255,255,255,0.4)] text-[10px]">{tx.time}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
