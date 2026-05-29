import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft } from 'lucide-react';

interface ImageCarouselWidgetProps {
  images: string[];
  height?: string;
  radius?: string;
  autoPlay?: boolean;
  interval?: string;
  interactive?: boolean;
}

export function ImageCarouselWidget({
  images,
  height = '400',
  radius = 'rounded-xl',
  autoPlay = true,
  interval = '3000',
  interactive = true,
}: ImageCarouselWidgetProps) {
  const [index, setIndex] = useState(0);
  const count = images.length || 1;
  const ms = parseInt(interval, 10) || 3000;

  useEffect(() => {
    if (!autoPlay || !interactive || count <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, ms);
    return () => window.clearInterval(id);
  }, [autoPlay, interactive, count, ms]);

  const go = (dir: -1 | 1) => {
    if (!interactive) return;
    setIndex((i) => (i + dir + count) % count);
  };

  return (
    <div
      className={`w-full overflow-hidden shadow-lg relative group border border-black/5 ${radius}`}
      style={{ height: `${height}px` }}
    >
      <AnimatePresence mode="wait">
        <motion.img
          key={index}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          src={images[index] ?? images[0]}
          alt={`Slide ${index + 1}`}
          className="w-full h-full object-cover absolute inset-0"
        />
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
      {interactive && count > 1 && (
        <>
          <div className="absolute inset-0 flex items-center justify-between p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <motion.button
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => go(-1)}
              className="w-12 h-12 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center shadow-md border border-black/5 text-zinc-900 hover:bg-white transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </motion.button>
            <motion.button
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => go(1)}
              className="w-12 h-12 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center shadow-md border border-black/5 text-zinc-900 hover:bg-white transition-colors"
            >
              <ChevronLeft className="w-6 h-6 rotate-180" />
            </motion.button>
          </div>
          <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-3">
            {images.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => interactive && setIndex(idx)}
                className={`h-2.5 rounded-full shadow-sm transition-all duration-300 ${idx === index ? 'bg-white w-8' : 'bg-white/50 hover:bg-white/80 w-2.5'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
