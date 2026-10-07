const gray = {
    50: '#f2f3f5',
    100: '#e3e5e8',
    200: '#d6d9df',
    300: '#c1c6cf',
    400: '#b0b5bf',
    500: '#8a909d',
    600: '#41444c',
    700: '#313338',
    800: '#232428',
    900: '#1e1f22',
    950: '#18191c',
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
    content: [
        './resources/scripts/**/*.{js,ts,tsx}',
    ],
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
            borderColor: theme => ({
                default: theme('colors.neutral.400', 'currentColor'),
            }),
        },
    },
    plugins: [
        require('@tailwindcss/line-clamp'),
        require('@tailwindcss/forms')({
            strategy: 'class',
        }),
    ]
};
