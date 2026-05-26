import { useState } from 'react';
import { motion } from 'motion/react';

export interface TabItem {
  title: string;
  content: string;
}

export function TabsElement({
  tabs,
  activeColor = '#18181b',
  bgColor = '#ffffff',
}: {
  tabs: TabItem[];
  activeColor?: string;
  bgColor?: string;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const safeTabs = tabs?.length ? tabs : [{ title: 'Aba 1', content: 'Conteúdo da aba.' }];
  const active = safeTabs[activeIdx] ?? safeTabs[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="w-full rounded-3xl overflow-hidden shadow-lg glass-panel border border-black/5"
      style={{ backgroundColor: bgColor }}
    >
      <div className="flex border-b border-black/5 bg-white/50 backdrop-blur-md overflow-x-auto custom-scrollbar-hide">
        {safeTabs.map((tab, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setActiveIdx(idx)}
            className={`flex-1 py-5 px-8 text-sm font-bold transition-all whitespace-nowrap ${
              idx === activeIdx ? 'text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'
            }`}
            style={
              idx === activeIdx
                ? { color: activeColor, borderBottom: `2px solid ${activeColor}`, backgroundColor: 'rgba(0,0,0,0.02)' }
                : undefined
            }
          >
            {tab.title}
          </button>
        ))}
      </div>
      <div className="p-8 md:p-10 text-zinc-600 leading-relaxed text-lg bg-white/50 whitespace-pre-wrap">
        {active.content}
      </div>
    </motion.div>
  );
}
