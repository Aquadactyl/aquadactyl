import styled from 'styled-components';

const SubNavigation = styled.div`
  width: 100%;
  background-color: #11161b;
  border-bottom: 1px solid #272e35;
  overflow-x: auto;

  & > div {
    display: flex;
    align-items: center;
    font-size: 0.875rem;
    margin-left: auto;
    margin-right: auto;
    padding-left: 1rem;
    padding-right: 1rem;
    max-width: 1200px;

    & > a,
    & > div {
      display: inline-block;
      padding: 1rem 0.75rem;
      color: #9ca5af;
      text-decoration: none;
      white-space: nowrap;
      transition: all 150ms;

      &:not(:first-of-type) {
        margin-left: 0.5rem;
      }

      &:hover {
        color: #e9ecef;
      }

      &:active,
      &.active {
        color: #a4e3dc;
        box-shadow: inset 0 -2px #78d4cc;
      }
    }
  }
`;

export default SubNavigation;
