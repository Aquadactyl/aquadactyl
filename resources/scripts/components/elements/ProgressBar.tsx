import React, { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { useAppStore } from '@/state';
import { randomInt } from '@/helpers';
import Fade from '@/components/elements/Fade';

const BarFill = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, style, ...props }, ref) => (
  <div
    ref={ref}
    className={classNames(
      'h-full bg-cyan-400 shadow-[0_0_6px_rgb(85_192_183/25%)] transition-all duration-250 ease-in-out',
      className,
    )}
    style={style}
    {...props}
  />
));

type Timer = ReturnType<typeof setTimeout>;

export default () => {
  const interval = useRef<Timer>(null) as React.MutableRefObject<Timer>;
  const timeout = useRef<Timer>(null) as React.MutableRefObject<Timer>;
  const [visible, setVisible] = useState(false);
  const progress = useAppStore((state) => state.progress.progress);
  const continuous = useAppStore((state) => state.progress.continuous);
  const setProgress = useAppStore((state) => state.progress.setProgress);

  useEffect(() => {
    return () => {
      timeout.current && clearTimeout(timeout.current);
      interval.current && clearInterval(interval.current);
    };
  }, []);

  useEffect(() => {
    setVisible((progress || 0) > 0);

    if (progress === 100) {
      timeout.current = setTimeout(() => setProgress(undefined), 500);
    }
  }, [progress]);

  useEffect(() => {
    if (!continuous) {
      interval.current && clearInterval(interval.current);
      return;
    }

    if (!progress || progress === 0) {
      setProgress(randomInt(20, 30));
    }
  }, [continuous]);

  useEffect(() => {
    if (continuous) {
      interval.current && clearInterval(interval.current);
      if ((progress || 0) >= 90) {
        setProgress(90);
      } else {
        interval.current = setTimeout(
          () => setProgress((progress || 0) + randomInt(1, 5)),
          500,
        );
      }
    }
  }, [progress, continuous]);

  return (
    <div className={'fixed w-full'} style={{ height: '2px' }}>
      <Fade in={visible} unmountOnExit timeout={150}>
        <BarFill
          style={{
            width: progress === undefined ? '100%' : `${progress}%`,
          }}
        />
      </Fade>
    </div>
  );
};
