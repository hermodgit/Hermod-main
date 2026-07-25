import React, { useState } from 'react';
import {
  Hexagon,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Wallet,
  Briefcase,
  AlertTriangle,
  CheckSquare,
  ListOrdered,
  Bot,
  Repeat,
  ShieldCheck,
  Code,
  Settings,
  Bell,
  Search,
  Plus,
  RefreshCw,
  TrendingUp,
  Clock,
  AlertCircle
} from 'lucide-react';

export default function NeuralGrid() {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  const navItems = [
    { group: 'MAIN', items: [
      { label: 'Dashboard', icon: LayoutDashboard, active: true },
      { label: 'Wallets', icon: Wallet },
      { label: 'Portfolio', icon: Briefcase },
    ]},
    { group: 'FINANCE', items: [
      { label: 'Risk', icon: AlertTriangle },
      { label: 'Approvals', icon: CheckSquare },
      { label: 'Transactions', icon: ListOrdered },
      { label: 'Recurring', icon: Repeat },
    ]},
    { group: 'SYSTEM', items: [
      { label: 'Agents', icon: Bot },
      { label: 'Audit', icon: ShieldCheck },
      { label: 'Developer', icon: Code },
      { label: 'Settings', icon: Settings },
    ]}
  ];

  const stats = [
    { label: 'Total Portfolio Value', value: '$2,847,392.18', delta: '+4.2%', deltaColor: 'text-[#39FF14]', color: '#39FF14', icon: TrendingUp, bars: [3, 5, 4, 7, 5, 8, 6, 9, 10, 8, 12] },
    { label: 'Active Agents', value: '12', delta: 'Running', deltaColor: 'text-[#00FFD1]', color: '#00FFD1', icon: Bot, bars: [8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8] },
    { label: 'Pending Txns', value: '3', delta: 'Requires Auth', deltaColor: 'text-[#F5A623]', color: '#F5A623', icon: Clock, bars: [1, 2, 1, 3, 2, 4, 3, 5, 3, 2, 3] },
    { label: 'Risk Alerts', value: '1', delta: 'High Severity', deltaColor: 'text-[#FF4444]', color: '#FF4444', icon: AlertCircle, bars: [1, 1, 1, 1, 1, 12, 1, 1, 1, 1, 1] }
  ];

  const txns = [
    { hash: '0x8f...2a1b', type: 'SWAP', amount: '+4.50 ETH', amountColor: 'text-[#39FF14]', chain: 'ETH', chainColor: 'bg-[#627EEA]/20 text-[#627EEA]', status: 'SUCCESS', statusColor: 'bg-[#39FF14]/10 text-[#39FF14]', time: '2 mins ago' },
    { hash: '0x3c...9d4e', type: 'WITHDRAW', amount: '-12,500 USDC', amountColor: 'text-[#FF4444]', chain: 'BASE', chainColor: 'bg-[#0052FF]/20 text-[#0052FF]', status: 'PENDING', statusColor: 'bg-[#F5A623]/10 text-[#F5A623]', time: '15 mins ago' },
    { hash: '0x1a...5f6c', type: 'STAKE', amount: '50,000 ARB', amountColor: 'text-[#888888]', chain: 'ARB', chainColor: 'bg-[#28A0F0]/20 text-[#28A0F0]', status: 'SUCCESS', statusColor: 'bg-[#39FF14]/10 text-[#39FF14]', time: '1 hr ago' },
    { hash: '0x9b...4e2a', type: 'APPROVE', amount: 'Unlimited', amountColor: 'text-[#888888]', chain: 'ETH', chainColor: 'bg-[#627EEA]/20 text-[#627EEA]', status: 'FAILED', statusColor: 'bg-[#FF4444]/10 text-[#FF4444]', time: '3 hrs ago' },
    { hash: '0x5d...1c8f', type: 'SWAP', amount: '+1.25 ETH', amountColor: 'text-[#39FF14]', chain: 'BASE', chainColor: 'bg-[#0052FF]/20 text-[#0052FF]', status: 'SUCCESS', statusColor: 'bg-[#39FF14]/10 text-[#39FF14]', time: '5 hrs ago' },
  ];

  return (
    <div className="flex h-screen w-full bg-[#080808] text-[#E8E8E8] overflow-hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap');
        .font-mono { font-family: 'JetBrains Mono', monospace !important; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      
      {/* Sidebar */}
      <div className={`flex flex-col bg-[#0D0D0D] border-r border-[#1A1A1A] transition-all duration-300 shrink-0 ${sidebarExpanded ? 'w-[240px]' : 'w-[48px]'}`}>
        {/* Header */}
        <div className="h-[40px] flex items-center justify-between px-3 border-b border-[#1A1A1A] shrink-0">
          {sidebarExpanded ? (
            <>
              <div className="flex items-center gap-2">
                <Hexagon size={16} className="text-[#39FF14]" />
                <span className="text-[12px] font-bold tracking-wider text-[#E8E8E8]">HERMOD</span>
              </div>
              <button onClick={() => setSidebarExpanded(false)} className="text-[#555] hover:text-[#39FF14] bg-[#1A1A1A] p-0.5 rounded-[2px] transition-colors">
                <ChevronLeft size={14} />
              </button>
            </>
          ) : (
            <div className="w-full flex justify-center items-center">
               <button onClick={() => setSidebarExpanded(true)} className="text-[#555] hover:text-[#39FF14] p-1 rounded-[2px] transition-colors">
                 <ChevronRight size={14} />
               </button>
            </div>
          )}
        </div>
        
        {/* Nav items */}
        <div className="flex-1 overflow-y-auto py-3 scrollbar-hide">
          {navItems.map((group, i) => (
            <div key={i} className="mb-4">
              {sidebarExpanded && (
                <div className="px-4 mb-2 text-[9px] uppercase text-[#444] tracking-wider font-semibold">
                  {group.group}
                </div>
              )}
              {group.items.map((item, j) => {
                 const Icon = item.icon;
                 const isActive = item.active;
                 return (
                   <div 
                     key={j} 
                     className={`relative flex items-center h-[36px] cursor-pointer group transition-colors ${
                       isActive ? 'bg-[#1A1A1A]' : 'hover:bg-[#1A1A1A]/50'
                     } ${
                       isActive && sidebarExpanded ? 'border-l-2 border-[#39FF14]' : 'border-l-2 border-transparent'
                     }`}
                   >
                     <div className={`w-[46px] flex flex-col items-center justify-center shrink-0 ${
                       isActive ? 'text-[#39FF14]' : 'text-[#444] group-hover:text-[#888]'
                     } transition-colors`}>
                       <Icon size={12} />
                       {!sidebarExpanded && isActive && <div className="w-1 h-1 bg-[#39FF14] rounded-full mt-1" />}
                     </div>
                     {sidebarExpanded && (
                       <span className={`text-[11px] truncate transition-colors ${
                         isActive ? 'text-[#39FF14]' : 'text-[#555] group-hover:text-[#888]'
                       }`}>{item.label}</span>
                     )}
                   </div>
                 )
              })}
            </div>
          ))}
        </div>

        {/* User profile */}
        <div className="border-t border-[#1A1A1A] p-2 flex items-center h-[48px] shrink-0">
          {sidebarExpanded ? (
            <div className="flex items-center gap-2 w-full px-2 cursor-pointer group">
              <div className="relative shrink-0">
                <div className="w-6 h-6 rounded-full bg-[#1A1A1A] flex items-center justify-center text-[10px] text-[#888] border border-[#222] group-hover:border-[#333] transition-colors">
                  OP
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-[#39FF14] rounded-full border border-[#0D0D0D]" />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-[11px] text-[#E8E8E8] truncate group-hover:text-[#fff] transition-colors">0xPr0xy</span>
                <span className="text-[9px] text-[#555] truncate">SysAdmin</span>
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-center relative cursor-pointer">
              <div className="w-6 h-6 rounded-full bg-[#1A1A1A] flex items-center justify-center text-[10px] text-[#888] border border-[#222]">
                OP
              </div>
              <div className="absolute bottom-0 right-1 w-2 h-2 bg-[#39FF14] rounded-full border border-[#0D0D0D]" />
            </div>
          )}
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <div className="h-[40px] flex items-center justify-between px-4 bg-[#0D0D0D] border-b border-[#1A1A1A] shrink-0">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-[#555] cursor-pointer hover:text-[#888] transition-colors">Hermod</span>
            <ChevronRight size={12} className="text-[#444]" />
            <span className="text-[#E8E8E8]">Dashboard</span>
          </div>
          
          {/* Right actions */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 border-r border-[#1A1A1A] pr-4">
              <button className="text-[#555] hover:text-[#00FFD1] transition-colors"><Search size={14} /></button>
              <button className="text-[#555] hover:text-[#00FFD1] transition-colors"><Plus size={14} /></button>
              <button className="text-[#555] hover:text-[#00FFD1] transition-colors"><RefreshCw size={14} /></button>
            </div>
            
            <button className="relative text-[#555] hover:text-[#39FF14] transition-colors mr-1">
              <Bell size={14} />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-[#39FF14] rounded-full"></span>
            </button>
            
            <button className="flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#222] transition-colors px-2.5 py-1 rounded-[2px] border border-[#222]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#39FF14] shadow-[0_0_4px_#39FF14]"></div>
              <span className="font-mono text-[11px] text-[#00FFD1]">0x7F...3B9A</span>
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-6">
          
          {/* Header */}
          <div>
            <h1 className="text-[14px] font-semibold text-[#E8E8E8] mb-1">Portfolio Overview</h1>
            <p className="text-[11px] text-[#555]">Real-time risk and asset monitoring across networks.</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-[2px] flex flex-col relative overflow-hidden group hover:border-[#333] transition-colors">
                  <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ backgroundColor: stat.color }} />
                  <div className="p-3.5">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] text-[#666] uppercase tracking-wider font-medium">{stat.label}</span>
                      <Icon size={14} style={{ color: stat.color }} className="opacity-80" />
                    </div>
                    <div className="font-mono text-[16px] font-bold text-[#E8E8E8] mb-1">{stat.value}</div>
                    <div className={`text-[10px] ${stat.deltaColor}`}>{stat.delta}</div>
                  </div>
                  
                  {/* Sparkline fake */}
                  <div className="mt-auto h-8 flex items-end gap-[3px] px-3.5 pb-2 opacity-30 group-hover:opacity-70 transition-opacity">
                    {stat.bars.map((h, j) => (
                      <div key={j} className="flex-1 bg-current transition-all duration-500 ease-in-out" style={{ height: `${(h/12)*100}%`, color: stat.color }} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Table */}
          <div className="border border-[#1A1A1A] rounded-[2px] bg-[#0D0D0D] overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-[#1A1A1A] flex justify-between items-center bg-[#111]">
              <div className="flex items-center gap-2">
                <ListOrdered size={14} className="text-[#888]" />
                <span className="text-[12px] font-semibold text-[#E8E8E8]">Recent Transactions</span>
              </div>
              <button className="text-[10px] text-[#00FFD1] hover:text-[#39FF14] transition-colors uppercase tracking-wider font-medium">View All</button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#1A1A1A] bg-[#0A0A0A]">
                    <th className="px-3 py-2 text-[10px] uppercase text-[#555] font-semibold tracking-wider">Hash</th>
                    <th className="px-3 py-2 text-[10px] uppercase text-[#555] font-semibold tracking-wider">Type</th>
                    <th className="px-3 py-2 text-[10px] uppercase text-[#555] font-semibold tracking-wider">Amount</th>
                    <th className="px-3 py-2 text-[10px] uppercase text-[#555] font-semibold tracking-wider">Chain</th>
                    <th className="px-3 py-2 text-[10px] uppercase text-[#555] font-semibold tracking-wider">Status</th>
                    <th className="px-3 py-2 text-[10px] uppercase text-[#555] font-semibold tracking-wider text-right">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {txns.map((tx, i) => (
                    <tr key={i} className={`border-b border-[#1A1A1A] last:border-0 ${i % 2 === 0 ? 'bg-[#0D0D0D]' : 'bg-[#080808]'} hover:bg-[#151515] transition-colors`}>
                      <td className="px-3 py-2.5 text-[12px] font-mono text-[#00FFD1] cursor-pointer hover:underline">{tx.hash}</td>
                      <td className="px-3 py-2.5 text-[11px] text-[#E8E8E8]">{tx.type}</td>
                      <td className={`px-3 py-2.5 text-[12px] font-mono ${tx.amountColor}`}>{tx.amount}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-[2px] font-bold tracking-wide uppercase ${tx.chainColor}`}>{tx.chain}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-[2px] font-bold tracking-wide uppercase ${tx.statusColor}`}>{tx.status}</span>
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-[#555] text-right font-mono">{tx.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
