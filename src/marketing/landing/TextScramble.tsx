import { useEffect, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';

const chars = '!<>-_\\/[]{}=+*^?#@$%&';

export function TextScramble({ text }: { text: string }) {
  const reducedMotion = useReducedMotion();
  const [displayText, setDisplayText] = useState(reducedMotion ? text : '');

  useEffect(() => {
    if (reducedMotion) {
      setDisplayText(text);
      return;
    }

    let frame = 0;
    let requestRef: number;
    const queue: { from: string; to: string; start: number; end: number; char: string }[] = [];

    for (let i = 0; i < text.length; i++) {
      const to = text[i];
      const start = Math.floor(Math.random() * 40);
      const end = start + Math.floor(Math.random() * 40);
      queue.push({ from: '', to, start, end, char: '' });
    }

    const update = () => {
      let output = '';
      let complete = 0;

      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        if (frame >= item.end) {
          complete++;
          output += item.to;
        } else if (frame >= item.start) {
          if (!item.char || Math.random() < 0.28) {
            item.char = chars[Math.floor(Math.random() * chars.length)];
          }
          output += `<span class="text-brand-500">${item.char}</span>`;
        } else {
          output += item.from;
        }
      }

      setDisplayText(output);

      if (complete === queue.length) {
        cancelAnimationFrame(requestRef);
      } else {
        requestRef = requestAnimationFrame(update);
        frame++;
      }
    };

    update();

    return () => cancelAnimationFrame(requestRef);
  }, [text, reducedMotion]);

  if (reducedMotion) {
    return <span>{text}</span>;
  }

  return <span dangerouslySetInnerHTML={{ __html: displayText }} />;
}
