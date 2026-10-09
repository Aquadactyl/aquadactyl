import React from 'react';
import { useLocation, type Location } from 'react-router';
import { SwitchTransition } from 'react-transition-group';
import Fade from '@/components/elements/Fade';
import styled from 'styled-components';

const StyledSwitchTransition = styled(SwitchTransition)`
    position: relative;

    & section {
        position: absolute;
        width: 100%;
        top: 0;
        left: 0;
    }
`;

interface TransitionRouterProps {
    location?: Location;
    children?: React.ReactNode;
}

const TransitionRouter: React.FC<TransitionRouterProps> = ({ location: propLocation, children }) => {
    const routeLocation = useLocation();
    const loc = propLocation || routeLocation;
    return (
        <StyledSwitchTransition>
            <Fade timeout={150} key={loc.pathname + loc.search} in appear unmountOnExit>
                <section>{children}</section>
            </Fade>
        </StyledSwitchTransition>
    );
};

export default TransitionRouter;
