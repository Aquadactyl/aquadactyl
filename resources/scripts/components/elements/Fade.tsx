import React from 'react';
import { AnimatePresence, motion } from 'motion/react';

export interface FadeProps {
  timeout?: number;
  in?: boolean;
  appear?: boolean;
  unmountOnExit?: boolean;
  onExited?: () => void;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const Fade: React.FC<FadeProps> = ({
  timeout = 150,
  in: show = true,
  unmountOnExit = false,
  onExited,
  children,
  className,
  style,
}) => {
  const duration = timeout / 1000;

  if (unmountOnExit) {
    return (
      <AnimatePresence onExitComplete={onExited}>
        {show && (
          <motion.div
            className={className}
            style={style}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration, ease: [0.4, 0, 1, 1] }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <motion.div
      className={className}
      style={style}
      initial={false}
      animate={{ opacity: show ? 1 : 0 }}
      transition={{ duration, ease: [0.4, 0, 1, 1] }}
      onAnimationComplete={() => {
        if (!show && onExited) {
          onExited();
        }
      }}
    >
      {children}
    </motion.div>
  );
};

Fade.displayName = 'Fade';

export default Fade;
