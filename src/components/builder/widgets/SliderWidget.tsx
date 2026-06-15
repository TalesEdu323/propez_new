import { useRef, useState } from 'react';
import { motion } from 'motion/react';

interface Slide {
  title: string;
  desc: string;
  image: string;
}

interface SliderWidgetProps {
  slides: Slide[];
  height?: string;
  interactive?: boolean;
}

export function SliderWidget({ slides, height = '400', interactive = true }: SliderWidgetProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollTo = (idx: number) => {
    if (!interactive || !scrollRef.current) return;
    const el = scrollRef.current;
    const slideWidth = el.offsetWidth;
    el.scrollTo({ left: slideWidth * idx, behavior: 'smooth' });
    setActiveIndex(idx);
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const idx = Math.round(el.scrollLeft / el.offsetWidth);
    if (idx !== activeIndex) setActiveIndex(idx);
  };

  return (
    <div
      className="w-full relative group overflow-hidden rounded-[2rem] shadow-lg border border-black/5"
      style={{ height: `${height}px` }}
    >
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex w-full h-full overflow-x-auto snap-x snap-mandatory custom-scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {slides.map((slide, idx) => (
          <div key={idx} className="w-full h-full flex-shrink-0 snap-center relative">
            <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-12">
              <motion.h3
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-5xl font-black text-white mb-4 tracking-tight drop-shadow-md"
              >
                {slide.title}
              </motion.h3>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-xl text-white/80 max-w-2xl leading-relaxed drop-shadow-sm"
              >
                {slide.desc}
              </motion.p>
            </div>
          </div>
        ))}
      </div>
      {interactive && slides.length > 1 && (
        <div className="absolute bottom-6 left-0 w-full flex justify-center gap-3">
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => scrollTo(idx)}
              className={`h-2.5 rounded-full transition-all duration-300 shadow-sm ${idx === activeIndex ? 'bg-white w-8' : 'bg-white/50 hover:bg-white/80 w-2.5'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
