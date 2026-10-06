import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';
import { createDatabase } from '../src/db/client.js';
import { createFinanceRepository } from '../src/modules/finance/repository.js';
import { createBudgetRepository } from '../src/modules/finance/budget-repository.js';
import { createGoalRepository } from '../src/modules/finance/goal-repository.js';
import { createRecurrenceRepository } from '../src/modules/finance/recurrence-repository.js';
import { createNetWorthRepository } from '../src/modules/finance/net-worth-repository.js';
import { createYieldRepository,createMarketRateCache } from '../src/modules/finance/yield-repository.js';
import { MarketRateService } from '../src/modules/finance/yield-market.js';
import { createCardRepository } from '../src/modules/finance/card-repository.js';

// Offline contract generation. No database or identity provider is contacted.
const config = loadConfig({ NODE_ENV: 'test', TEST_DATABASE_URL: 'postgresql://test@127.0.0.1/beter_life_test',
  SUPABASE_URL: 'https://identity.example.test', CORS_ORIGINS: 'http://localhost:3000' });
const unavailable = async (): Promise<never> => { throw new Error('Offline dependency must not be called'); };
const database = createDatabase(config); // Lazy pool: contract generation never opens a connection.
const app = await buildApp(config, { dependencies: {
  profiles: { findByAuthUser: unavailable, upsertForAuthUser: unavailable }, finance: createFinanceRepository(database), budgets: createBudgetRepository(database), goals: createGoalRepository(database), recurrences: createRecurrenceRepository(database), netWorth:createNetWorthRepository(database),yield:createYieldRepository(database),market:new MarketRateService(createMarketRateCache(database)),cards:createCardRepository(database),ping: unavailable, close: database.close,
} });
try {
  const json = JSON.stringify(app.swagger(), null, 2) + '\n';
  const path = 'openapi/openapi.json';
  if (process.argv.includes('--check')) {
    if (await readFile(path, 'utf8') !== json) throw new Error('OpenAPI drift: regenerate and review the contract.');
  } else { await mkdir('openapi', { recursive: true }); await writeFile(path, json); }
  process.stdout.write(`OpenAPI SHA256 ${createHash('sha256').update(json).digest('hex')}\n`);
} finally { await app.close(); }
