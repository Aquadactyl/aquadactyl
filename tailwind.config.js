const gray = {
    50: '#f5f6f7',
    100: '#e9ecef',
    200: '#d7dce1',
    300: '#bbc2ca',
    400: '#9ca5af',
    500: '#78838f',
    600: '#39424b',
    700: '#272e35',
    800: '#171c21',
    900: '#11161b',
    950: '#0c1116',
};

const aqua = {
    50: '#effcfa',
    100: '#d2f1ed',
    200: '#a4e3dc',
    300: '#78d4cc',
    400: '#55c0b7',
    500: '#237c7f',
    600: '#20696d',
    700: '#1d5558',
    800: '#204448',
    900: '#1d363a',
    950: '#122528',
};

module.exports = {
    content: ['./resources/scripts/**/*.{js,ts,tsx}'],
    theme: {
        extend: {
            fontFamily: {
                sans: ['"IBM Plex Sans"', '"Segoe UI"', 'system-ui', 'sans-serif'],
                header: ['"IBM Plex Sans"', '"Roboto"', 'system-ui', 'sans-serif'],
            },
            colors: {
                black: gray[950],
                // "primary" and "neutral" are deprecated, prefer the use of "blue" and "gray"
                // in new code.
                primary: aqua,
                blue: aqua,
                gray: gray,
                neutral: gray,
                cyan: aqua,
            },
            borderRadius: {
                DEFAULT: '0.5rem',
            },
            fontSize: {
                '2xs': '0.625rem',
            },
            transitionDuration: {
                250: '250ms',
            },
            borderColor: (theme) => ({
                default: theme('colors.neutral.400', 'currentColor'),
            }),
        },
    },
    plugins: [
        require('@tailwindcss/line-clamp'),
        require('@tailwindcss/forms')({
            strategy: 'class',
        }),
    ],
};
