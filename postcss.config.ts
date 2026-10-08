import postcssImport from 'postcss-import';
import tailwindcssNesting from 'tailwindcss/nesting/index.js';
import postcssNesting from 'postcss-nesting';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import postcssPresetEnv from 'postcss-preset-env';

export default {
    plugins: [
        postcssImport(),
        // We want to make use of nesting following the CSS Nesting spec, and not the
        // SASS style nesting.
        //
        // @see https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-nesting
        tailwindcssNesting(postcssNesting),
        tailwindcss(),
        autoprefixer(),
        postcssPresetEnv({
            features: {
                'nesting-rules': false,
            },
        }),
    ],
};
