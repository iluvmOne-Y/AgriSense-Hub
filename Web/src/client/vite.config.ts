import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import dotenv from 'dotenv'

export default defineConfig(() => {
	// Load the environment files into a single object
	const env = {
		// ...dotenv.config({
		//     path: path.resolve(__dirname, '../shared/shared.env'),
		// }).parsed,
		...dotenv.config({ path: path.resolve(__dirname, 'client.env') })
			.parsed,
	}

	// Exposes the variables to your client-side code via `import.meta.env`
	const envWithMeta = Object.entries(env).reduce((prev, [key, val]) => {
		return {
			...prev,
			[`import.meta.env.${key}`]: JSON.stringify(val),
		}
	}, {})

	return {
		plugins: [
			react({
				babel: {
					plugins: [['babel-plugin-react-compiler']],
				},
			}),
		],
		resolve: {
			alias: {
				Client: path.resolve(__dirname, './src'),
				Shared: path.resolve(__dirname, '../shared/src'),
			},
		},
		server: {
			fs: {
				allow: ['.', '..'],
			},
		},
		define: envWithMeta,
	}
})
