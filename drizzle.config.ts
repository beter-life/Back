import { defineConfig } from 'drizzle-kit';

// Generation is offline. The migration launcher supplies a validated URL only at execution.
export default defineConfig({ dialect: 'postgresql', schema: './src/db/schema/*.ts', out: './drizzle', strict: true });
