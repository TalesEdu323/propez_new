import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import type { AccordionItem } from '../propUtils';

interface AccordionWidgetProps {
  items: AccordionItem[];
  bgColor?: string;
  interactive?: boolean;
}

export function AccordionWidget({ items, bgColor = '#ffffff', interactive = true }: AccordionWidgetProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(interactive ? 0 : 0);

  return (
    <div className="space-y-3 w-full">
      {items.map((item, idx) => {
        const isOpen = openIndex === idx;
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-panel border border-black/5 rounded-2xl overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md"
            style={{ backgroundColor: bgColor }}
          >
            <button
              type="button"
              onClick={() => interactive && setOpenIndex(isOpen ? null : idx)}
              className="w-full p-6 flex justify-between items-center bg-black/5 border-b border-black/5 cursor-pointer group text-left"
            >
              <h4 className="font-bold text-zinc-900 text-lg group-hover:text-blue-600 transition-colors pr-4">
                {item.title}
              </h4>
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronDown className="w-5 h-5 text-zinc-400 group-hover:text-blue-600 transition-colors shrink-0" />
              </motion.div>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="p-6 text-zinc-600 leading-relaxed bg-white/50 backdrop-blur-md whitespace-pre-line">
                    {item.content}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
