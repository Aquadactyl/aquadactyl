import styled from 'styled-components/macro';
import tw, { theme } from 'twin.macro';

const SubNavigation = styled.div`
    ${tw`w-full bg-neutral-900 border-b border-neutral-700 overflow-x-auto`};

    & > div {
        ${tw`flex items-center text-sm mx-auto px-4`};
        max-width: 1200px;

        & > a,
        & > div {
            ${tw`inline-block py-4 px-3 text-neutral-400 no-underline whitespace-nowrap transition-all duration-150`};

            &:not(:first-of-type) {
                ${tw`ml-2`};
            }

            &:hover {
                ${tw`text-neutral-100`};
            }

            &:active,
            &.active {
                ${tw`text-primary-200`};
                box-shadow: inset 0 -2px ${theme`colors.cyan.300`.toString()};
            }
        }
    }
`;

export default SubNavigation;
