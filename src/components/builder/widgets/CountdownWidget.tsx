import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import type { BuilderViewport } from '../../../types/builder';
import { countdownLayout } from '../viewportLayout';

interface CountdownWidgetProps {
  targetDate: string;
  targetTime?: string;
  color?: string;
  bgColor?: string;
  labelColor?: string;
  expiredText?: string;
  viewport?: BuilderViewport;
}

function getRemaining(target: Date) {
  const diff = Math.max(0, target.getTime() - Date.now());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds, expired: diff <= 0 };
}

export function CountdownWidget({
  targetDate,
  targetTime = '23:59',
  color = '#dc2626',
  bgColor = '#ffffff',
  labelColor = '#52525b',
  expiredText = 'Oferta Encerrada!',
  viewport = 'desktop',
}: CountdownWidgetProps) {
  const target = new Date(`${targetDate}T${targetTime}:00`);
  const [remaining, setRemaining] = useState(() => getRemaining(target));
  const layout = countdownLayout(viewport);

  useEffect(() => {
    const tick = () => setRemaining(getRemaining(target));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [targetDate, targetTime]);

  if (remaining.expired) {
    return (
      <div
        className={`flex items-center justify-center ${layout.padding} rounded-[2.5rem] shadow-lg glass-panel border border-black/5`}
        style={{ backgroundColor: bgColor }}
      >
        <p className="text-2xl font-bold" style={{ color }}>{expiredText}</p>
      </div>
    );
  }

  const values = [
    { label: 'Dias', value: String(remaining.days).padStart(2, '0') },
    { label: 'Horas', value: String(remaining.hours).padStart(2, '0') },
    { label: 'Minutos', value: String(remaining.minutes).padStart(2, '0') },
    { label: 'Segundos', value: String(remaining.seconds).padStart(2, '0') },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`flex flex-col items-center justify-center ${layout.padding} rounded-[2.5rem] shadow-lg glass-panel border border-black/5 relative overflow-hidden`}
      style={{ backgroundColor: bgColor }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-transparent pointer-events-none" />
      <div className={`flex flex-wrap justify-center ${layout.gap} text-center relative z-10`}>
        {values.map(({ label, value }) => (
          <div key={label} className="flex flex-col items-center">
            <div className={`${layout.box} rounded-2xl bg-white/80 backdrop-blur-md border border-black/5 flex items-center justify-center shadow-sm mb-3`}>
              <span className={`${layout.value} font-black font-mono tracking-tighter`} style={{ color }}>
                {value}
              </span>
            </div>
            <span className="text-sm font-bold uppercase tracking-widest" style={{ color: labelColor }}>{label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
