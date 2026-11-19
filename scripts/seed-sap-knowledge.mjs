#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from '../apps/api/node_modules/pg/lib/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

// 1. Load environment variables from apps/api/.env
const envPath = resolve(rootDir, 'apps/api/.env');
if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

// 2. Import compiled seed definitions
const seedPath = resolve(rootDir, 'apps/api/dist/tracks/seeds/question-bank.seed.js');
const { INITIAL_COMPETENCIES, INITIAL_QUESTIONS } = await import(`file://${seedPath}`);

const { Pool } = pg;
const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'postgres',
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function seed() {
  console.log('🌱 ============================================================');
  console.log('🌱 Starting Enterprise SAP Knowledge & Question Bank Seeding...');
  console.log('🌱 ============================================================');

  const client = await pool.connect();
  try {
    // 3. Upsert Competencies
    console.log(`\n📌 1. Seeding ${INITIAL_COMPETENCIES.length} competencies...`);
    const compSlugToId = new Map();

    for (const comp of INITIAL_COMPETENCIES) {
      const checkRes = await client.query('SELECT id FROM competencies WHERE slug = $1', [comp.slug]);
      let compId;

      if (checkRes.rows.length > 0) {
        compId = checkRes.rows[0].id;
        await client.query(
          `UPDATE competencies 
           SET name = $1, category = $2, description = $3, domain = $4, "isActive" = true, "updatedAt" = NOW()
           WHERE id = $5`,
          [comp.name, comp.category, comp.description, comp.domain, compId]
        );
        console.log(`   [UPDATED] [${comp.domain.toUpperCase()}] ${comp.name} (${comp.slug})`);
      } else {
        const insertRes = await client.query(
          `INSERT INTO competencies (domain, name, slug, category, description, "isActive", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
           RETURNING id`,
          [comp.domain, comp.name, comp.slug, comp.category, comp.description]
        );
        compId = insertRes.rows[0].id;
        console.log(`   [INSERTED] [${comp.domain.toUpperCase()}] ${comp.name} (${comp.slug})`);
      }

      compSlugToId.set(comp.slug, compId);
    }

    // 4. Upsert Questions
    console.log(`\n📌 2. Seeding ${INITIAL_QUESTIONS.length} interview questions...`);
    let insertedQuestions = 0;
    let updatedQuestions = 0;

    for (const q of INITIAL_QUESTIONS) {
      const compId = compSlugToId.get(q.competencySlug);
      if (!compId) {
        console.warn(`   ⚠️ Competency with slug ${q.competencySlug} not found. Skipping "${q.title}"`);
        continue;
      }

      const checkQ = await client.query('SELECT id FROM questions WHERE title = $1', [q.title]);

      const companyCategoriesJson = JSON.stringify(q.companyCategories);
      const experienceLevelsJson = JSON.stringify(q.experienceLevels);
      const expectedConceptsJson = JSON.stringify(q.expectedConcepts);
      const commonMisconceptionsJson = JSON.stringify(q.commonMisconceptions);
      const probingQuestionsJson = JSON.stringify(q.probingQuestions);
      const rubricGuideJson = JSON.stringify(q.rubricGuide);

      if (checkQ.rows.length > 0) {
        const qId = checkQ.rows[0].id;
        await client.query(
          `UPDATE questions
           SET "competencyId" = $1, domain = $2, "companyCategories" = $3, "experienceLevels" = $4,
               difficulty = $5, stem = $6, "contextPrompt" = $7, "expectedConcepts" = $8,
               "commonMisconceptions" = $9, "probingQuestions" = $10, "rubricGuide" = $11,
               "isActive" = true, "updatedAt" = NOW()
           WHERE id = $12`,
          [
            compId,
            q.domain,
            companyCategoriesJson,
            experienceLevelsJson,
            q.difficulty,
            q.stem,
            q.contextPrompt,
            expectedConceptsJson,
            commonMisconceptionsJson,
            probingQuestionsJson,
            rubricGuideJson,
            qId,
          ]
        );
        updatedQuestions++;
        console.log(`   [UPDATED] [${q.domain.toUpperCase()}] ${q.title}`);
      } else {
        await client.query(
          `INSERT INTO questions
           ("competencyId", domain, "companyCategories", "experienceLevels", difficulty, title, stem,
            "contextPrompt", "expectedConcepts", "commonMisconceptions", "probingQuestions", "rubricGuide",
            "isActive", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, NOW(), NOW())`,
          [
            compId,
            q.domain,
            companyCategoriesJson,
            experienceLevelsJson,
            q.difficulty,
            q.title,
            q.stem,
            q.contextPrompt,
            expectedConceptsJson,
            commonMisconceptionsJson,
            probingQuestionsJson,
            rubricGuideJson,
          ]
        );
        insertedQuestions++;
        console.log(`   [INSERTED] [${q.domain.toUpperCase()}] ${q.title}`);
      }
    }

    // 5. Verification Queries
    console.log('\n📊 3. Database Knowledge Verification Summary:');
    const compStats = await client.query(`
      SELECT domain, count(*) as count 
      FROM competencies 
      WHERE "isActive" = true 
      GROUP BY domain 
      ORDER BY domain ASC
    `);
    for (const row of compStats.rows) {
      console.log(`   - Competencies [${row.domain.toUpperCase()}]: ${row.count}`);
    }

    const qStats = await client.query(`
      SELECT q.domain, count(*) as count 
      FROM questions q 
      WHERE q."isActive" = true 
      GROUP BY q.domain 
      ORDER BY q.domain ASC
    `);
    for (const row of qStats.rows) {
      console.log(`   - Questions [${row.domain.toUpperCase()}]: ${row.count}`);
    }

    console.log('\n✅ Knowledge bank seeding finished successfully!');
    console.log(`   - Total questions processed: ${insertedQuestions + updatedQuestions} (Inserted: ${insertedQuestions}, Updated: ${updatedQuestions})`);
  } catch (err) {
    console.error('❌ Error seeding knowledge bank:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
