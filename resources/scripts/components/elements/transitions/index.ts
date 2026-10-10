import { Transition as TransitionComponent } from '@headlessui/react';
import FadeTransition from '@/components/elements/transitions/FadeTransition';

const Transition: typeof TransitionComponent & { Fade: typeof FadeTransition } =
  Object.assign(TransitionComponent, {
    Fade: FadeTransition,
  });

export { Transition };
