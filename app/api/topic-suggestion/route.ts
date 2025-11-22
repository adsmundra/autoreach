import { NextRequest, NextResponse } from 'next/server';
import { pool, db } from '@/lib/db'; // Import db
import { brandprofile } from '@/lib/db/schema'; // Import schema
import { eq, and } from 'drizzle-orm'; // Import operators
import { auth } from '@/lib/auth';
import { getProviderModel } from '@/lib/provider-config';
import { generateText } from 'ai';

async function ensureTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS topic_suggestions (
      id SERIAL PRIMARY KEY,
      email_id TEXT,
      brand_name TEXT NOT NULL,
      topics JSONB NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      UNIQUE (email_id, brand_name)
    );
  `;
  await pool.query(sql);
  // Also ensure unique index exists for legacy tables
  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS topic_suggestions_email_brand_uq ON topic_suggestions (email_id, brand_name)');
}

export async function DELETE(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) return NextResponse.json({ ok: true });
    await ensureTable();
    const session = await auth.api.getSession({ headers: request.headers as any });
    const userEmail = session?.user?.email || null;
    const body = await request.json();
    const brand = (body?.brand_name || '').toString().trim();
    const topic = (body?.topic || '').toString().trim();
    if (!brand || !topic) return NextResponse.json({ error: 'Missing brand_name or topic' }, { status: 400 });

    const sel = 'SELECT topics FROM topic_suggestions WHERE email_id IS NOT DISTINCT FROM $1 AND brand_name = $2';
    const resSel = await pool.query(sel, [userEmail, brand]);
    if (resSel.rows.length === 0) return NextResponse.json({ ok: true });
    const list: string[] = Array.isArray(resSel.rows[0].topics) ? resSel.rows[0].topics : [];
    const filtered = list.filter((t) => String(t).trim() !== topic);

    const upd = 'UPDATE topic_suggestions SET topics = $3, updated_at = now() WHERE email_id IS NOT DISTINCT FROM $1 AND brand_name = $2';
    await pool.query(upd, [userEmail, brand, JSON.stringify(filtered)]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('topic-suggestion delete error', e);
    return NextResponse.json({ error: 'Failed to delete topic' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
    }

    const session = await auth.api.getSession({ headers: request.headers as any });
    const userEmail = session?.user?.email || null;
    const userId = session?.user?.id || null;

    const body = await request.json();
    const brandName = (body?.brand_name || '').toString().trim();
    if (!brandName) return NextResponse.json({ error: 'Missing brand_name' }, { status: 400 });

    await ensureTable();

    // Fetch rich brand context from brandprofile if available
    let brandContext = '';
    if (userId) {
      try {
        const brands = await db
          .select()
          .from(brandprofile)
          .where(and(eq(brandprofile.userId, userId), eq(brandprofile.name, brandName)))
          .limit(1);

        if (brands.length > 0) {
          const b = brands[0];
          const keywords = (b.scrapedData as any)?.keywords || [];
          const description = b.description || (b.scrapedData as any)?.description || '';
          
          brandContext = `
Context about ${brandName}:
Industry: ${b.industry}
Description: ${description}
Keywords: ${keywords.join(', ')}
`;
          console.log('Found brand profile context for topic generation:', brandName);
        }
      } catch (err) {
        console.warn('Failed to fetch brand profile for context:', err);
      }
    }

    // Use Claude model via provider-config
    const model = getProviderModel('anthropic', 'claude-3-5-haiku-20241022');
    if (!model) return NextResponse.json({ error: 'Claude model not configured' }, { status: 500 });

    const currentYear = new Date().getFullYear();
    const system = `You are an SEO strategist. Propose concise, high-CTR, search-intent aligned blog topics to improve SEO/AEO rankings. Use the current year (${currentYear}) where relevant.`;
    
    let prompt = `Brand: ${brandName}
Generate 8-12 SEO-rich, user-intent focused topics with variations (how-to, listicle, comparison, vs, best-of, mistakes, guides). 
Include the year ${currentYear} in titles where it makes sense (e.g., "Best [Product] in ${currentYear}").
Return ONLY a raw JSON array of strings. No markdown formatting, no code blocks, no introductory text.`;
    
    if (brandContext) {
      prompt += `\n\n${brandContext}\n\nUse this context to make the topics highly relevant to the brand's specific niche and audience.`;
    }

    const { text } = await generateText({ model, system, prompt, temperature: 0.3, maxTokens: 800 });

    console.log('Raw AI response for topics:', text);

    let topics: string[] = [];
    try {
      // Try to clean markdown code blocks if present
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanText || '[]');
      if (Array.isArray(parsed)) {
        topics = parsed.filter((t) => typeof t === 'string').map((s) => s.trim()).filter(Boolean);
      }
    } catch {
      // Fallback: try to find array pattern
      try {
        const match = text.match(/\[.*\]/s);
        if (match) {
             const parsed = JSON.parse(match[0]);
             if (Array.isArray(parsed)) {
                topics = parsed.filter((t: any) => typeof t === 'string').map((s: any) => s.trim()).filter(Boolean);
             }
        }
      } catch (e2) {}

      // Last resort fallback: split by newline if not valid JSON
      if (topics.length === 0) {
         topics = (text || '').split(/\r?\n/).map((s) => s.replace(/^[-*]\s*/, '').trim()).filter(Boolean).slice(0, 12);
      }
    }

    if (topics.length === 0) return NextResponse.json({ error: 'No topics generated' }, { status: 500 });

    // Upsert per (email, brand) using unique constraint
    // Replace existing topics with new ones (overwrite logic)
    const upsert = `
      INSERT INTO topic_suggestions (email_id, brand_name, topics, updated_at)
      VALUES ($1, $2, $3, now())
      ON CONFLICT (email_id, brand_name) DO UPDATE SET topics = $3, updated_at = now()
      RETURNING id;
    `;
    await pool.query(upsert, [userEmail, brandName, JSON.stringify(topics)]);

    return NextResponse.json({ topics });
  } catch (e) {
    console.error('topic-suggestion error', e);
    return NextResponse.json({ error: 'Failed to generate topics' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ topics: [] });
    }
    // Ensure table exists in case GET is called before any POST
    await ensureTable();

    const session = await auth.api.getSession({ headers: request.headers as any });
    const userEmail = session?.user?.email || null;
    const { searchParams } = new URL(request.url);
    const brand = (searchParams.get('brand_name') || '').toString().trim();
    if (!brand) return NextResponse.json({ topics: [] });

    const sql = 'SELECT topics FROM topic_suggestions WHERE COALESCE(email_id, \'\') = COALESCE($1, \'\') AND brand_name = $2 ORDER BY updated_at DESC LIMIT 1';
    const res = await pool.query(sql, [userEmail, brand]);
    const topics = res.rows[0]?.topics || [];
    return NextResponse.json({ topics });
  } catch (e) {
    console.error('topic-suggestion list error', e);
    return NextResponse.json({ topics: [] });
  }
}
