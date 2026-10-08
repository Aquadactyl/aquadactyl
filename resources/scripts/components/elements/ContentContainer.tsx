import styled from 'styled-components';

const ContentContainer = styled.div`
    width: calc(100% - 64px);
    max-width: 1136px;
    margin-left: auto;
    margin-right: auto;

    @media (max-width: 800px) {
        width: calc(100% - 48px);
    }

    @media (max-width: 640px) {
        width: calc(100% - 40px);
    }
`;
ContentContainer.displayName = 'ContentContainer';

export default ContentContainer;
