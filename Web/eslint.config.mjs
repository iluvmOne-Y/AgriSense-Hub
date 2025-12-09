import { defineConfig } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import pluginReact from 'eslint-plugin-react'
import prettierConfig from 'eslint-config-prettier'

export default defineConfig(
    {
        ignores: ['dist', 'node_modules'],
    },

    // Base configuration for JavaScript and TypeScript files
    {
        files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
    },

    // TypeScript ESLint configurations
    tseslint.configs.base,
    ...tseslint.configs.recommended,

    // React Hooks configurations
    reactHooks.configs.flat.recommended,

    // React configurations
    {
        files: ['**/*.{ts,tsx,jsx}'],
        ...pluginReact.configs.flat.recommended,
        settings: {
            react: {
                version: 'detect',
            },
        },
    },

    // Specific rule adjustments
    {
        rules: {
            eqeqeq: 'off',
            '@typescript-eslint/unused-vars': 'warn',
            '@typescript-eslint/no-namespace': 'off',
            '@typescript-eslint/no-explicit-any': 'warn',
        },
    },

    // Prettier configuration
    prettierConfig
)
