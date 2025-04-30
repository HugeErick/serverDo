import { Router, Request, Response } from 'express';
import { getClient } from '../db/client';
import STOP_WORDS from '../types/stopWords';

// Gets the router from express but at this point 
// everything is after the /api prefix
const router = Router();

// Process the query to extract meaningful terms
function processQuery(rawQuery: string): string[] {
  return rawQuery
    .toLowerCase()
    .split(/\s+/)
    .filter(term => term.length > 2 && !STOP_WORDS.has(term))
    .map(term => term.replace(/[^a-z0-9]/g, '')); // small normalization
}

// i.e search endpoint
router.get('/search', async (req: Request, res: Response) => {
  try {
    const rawQuery = req.query.q as string;

    if (!rawQuery || rawQuery.trim().length === 0) {
      res.status(400).json({ error: 'Query parameter "q" is required' });
      return;
    }

    const terms = processQuery(rawQuery);
    const expandedTerms = await expandQueryWithSynonyms(terms);

    if (expandedTerms.length === 0) {
      res.status(400).json({ error: 'Query only contained stop words or was too short' });
      return;
    }

    const client = await getClient();

    const queryText = `
      WITH matched_terms AS (
        SELECT id FROM term WHERE name = ANY($1)
      ),
      document_score AS (
        SELECT
          h.document_id,
          SUM(h.frequency) AS total_score,
          ARRAY_AGG(t.name) AS matched_terms,
          COUNT(h.term_id) AS matched_count
        FROM has h
        JOIN term t ON h.term_id = t.id
        WHERE h.term_id IN (SELECT id FROM matched_terms)
        GROUP BY h.document_id
      )
      SELECT
        d.id, d.url, d.title, d.author, d.date,
        ds.total_score AS relevance_score,
        ds.matched_terms,
        ds.matched_count
      FROM document d
      JOIN document_score ds ON d.id = ds.document_id
      ORDER BY ds.total_score DESC, ds.matched_count DESC, d.date DESC
      LIMIT 10;
    `;

    const result = await client.query(queryText, [expandedTerms]);

    if (result.rows.length === 0) {
      res.status(404).json({
        query: rawQuery,
        processed_terms: expandedTerms,
        message: 'No documents found matching the query',
      });
      return;
    }

    res.json({
      query: rawQuery,
      processed_terms: expandedTerms,
      results: result.rows.map((doc) => ({
        url: doc.url,
        title: doc.title,
        author: doc.author,
        date: doc.date,
        relevance_score: doc.relevance_score,
        matched_terms: doc.matched_terms,
        matched_count: doc.matched_count,
      })),
    });
  } catch (error) {
    console.error('Error processing search query:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/test-db', async (req: Request, res: Response) => {
  try {
    const client = await getClient();
    const result = await client.query('SELECT NOW()');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ success: false, error: 'Database connection failed' });
  }
});

async function expandQueryWithSynonyms(terms: string[]): Promise<string[]> {
  const client = await getClient();
  const expandedTerms = new Set(terms); // Use a set to avoid duplicates

  for (const term of terms) {
    const result = await client.query(
      `SELECT t.name FROM term t
       JOIN synonyms s ON t.id = s.term_id
       WHERE s.synonym_name = $1`,
      [term]
    );
    result.rows.forEach((row) => expandedTerms.add(row.name));
  }

  return Array.from(expandedTerms);
}

export default router;
