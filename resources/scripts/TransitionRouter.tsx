import React from 'react';
import { useLocation, type Location } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';

interface TransitionRouterProps {
    location?: Location;
    children?: React.ReactNode;
}

const TransitionRouter: React.FC<TransitionRouterProps> = ({ location: propLocation, children }) => {
    const routeLocation = useLocation();
    const loc = propLocation || routeLocation;

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={loc.pathname + loc.search}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: [0.4, 0, 1, 1] }}
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
};

export default TransitionRouter;
