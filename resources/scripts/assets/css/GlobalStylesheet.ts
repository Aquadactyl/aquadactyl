import { createGlobalStyle } from 'styled-components';
import font from '@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2';

export default createGlobalStyle`
    @font-face {
        font-family: 'IBM Plex Sans';
        font-style: normal;
        font-display: swap;
        font-weight: 100 700;
        src: url(${font}) format('woff2-variations');
        unicode-range: U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;
    }

    :root {
        color-scheme: dark;
        scrollbar-color: #39424b #11161b;
    }

    body {
        font-family: "IBM Plex Sans", "Segoe UI", system-ui, sans-serif;
        background-color: #171c21;
        color: #d7dce1;
        letter-spacing: 0;
        -webkit-font-smoothing: antialiased;
        min-width: 320px;
    }

    h1, h2, h3, h4, h5, h6 {
        font-weight: 500;
        letter-spacing: normal;
        font-family: "IBM Plex Sans", "Roboto", system-ui, sans-serif;
    }

    p {
        color: #d7dce1;
        line-height: 1.625;
        font-family: "IBM Plex Sans", "Segoe UI", system-ui, sans-serif;
    }

    form {
        margin: 0;
    }

    ::selection {
        background: #1d5558;
        color: #effcfa;
    }

    textarea, select, input, button, button:focus, button:focus-visible {
        outline: 2px solid transparent;
        outline-offset: 2px;
    }

    a:focus-visible, button:focus-visible, [role=button]:focus-visible {
        outline: 2px solid #78d4cc;
        outline-offset: 3px;
    }

    input[type=number]::-webkit-outer-spin-button,
    input[type=number]::-webkit-inner-spin-button {
        -webkit-appearance: none !important;
        margin: 0;
    }

    input[type=number] {
        -moz-appearance: textfield !important;
    }

    /* Scroll Bar Style */
    ::-webkit-scrollbar {
        background: none;
        width: 16px;
        height: 16px;
    }

    ::-webkit-scrollbar-thumb {
        border: solid 0 rgb(0 0 0 / 0%);
        border-right-width: 4px;
        border-left-width: 4px;
        -webkit-border-radius: 9px 4px;
        -webkit-box-shadow: inset 0 0 0 1px #78838f, inset 0 0 0 4px #39424b;
    }

    ::-webkit-scrollbar-track-piece {
        margin: 4px 0;
    }

    ::-webkit-scrollbar-thumb:horizontal {
        border-right-width: 0;
        border-left-width: 0;
        border-top-width: 4px;
        border-bottom-width: 4px;
        -webkit-border-radius: 4px 9px;
    }

    ::-webkit-scrollbar-corner {
        background: transparent;
    }

    @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
        }
    }
`;
