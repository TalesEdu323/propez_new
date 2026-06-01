import { motion, type HTMLMotionProps } from 'motion/react';
import { Link, type LinkProps } from 'react-router-dom';
import { useRef, useState, type ReactNode } from 'react';

type MagneticBaseProps = {
  children: ReactNode;
  className?: string;
};

function useMagneticMotion() {
  const ref = useRef<HTMLElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouse = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    setPosition({ x: middleX * 0.25, y: middleY * 0.25 });
  };

  const reset = () => setPosition({ x: 0, y: 0 });

  return { ref, position, handleMouse, reset };
}

type MagneticButtonProps = MagneticBaseProps &
  Omit<HTMLMotionProps<'button'>, 'children'> & {
    type?: 'button' | 'submit' | 'reset';
  };

export function MagneticButton({ children, className, type = 'button', ...props }: MagneticButtonProps) {
  const { ref, position, handleMouse, reset } = useMagneticMotion();

  return (
    <motion.button
      ref={ref as React.Ref<HTMLButtonElement>}
      type={type}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: 'spring', stiffness: 150, damping: 15, mass: 0.1 }}
      className={className}
      {...props}
    >
      {children}
    </motion.button>
  );
}

type MagneticLinkProps = MagneticBaseProps & LinkProps;

export function MagneticLink({ children, className, to, ...props }: MagneticLinkProps) {
  const { ref, position, handleMouse, reset } = useMagneticMotion();

  return (
    <motion.div
      animate={{ x: position.x, y: position.y }}
      transition={{ type: 'spring', stiffness: 150, damping: 15, mass: 0.1 }}
      className="inline-block"
    >
      <Link
        ref={ref as React.Ref<HTMLAnchorElement>}
        to={to}
        onMouseMove={handleMouse}
        onMouseLeave={reset}
        className={className}
        {...props}
      >
        {children}
      </Link>
    </motion.div>
  );
}
