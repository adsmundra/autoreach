import { NextResponse } from 'next/server';
import { parse } from 'node-html-parser';
import { generateText } from 'ai';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getProviderModel, PROVIDER_CONFIGS } from '@/lib/provider-config';
import { pool, db } from '@/lib/db';
import { brandprofile } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';

const CLAUDE_DEFAULT_MODEL = 'claude-3-5-haiku-20241022';
const MAX_TOKENS = process.env.MAX_TOKENS ? Number(process.env.MAX_TOKENS) : 2000;

async function fetchHtml(url: string, timeoutMs = 15000): Promise<string> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CompanyBlogger/1.0)' },
      signal: controller.signal,
    });
    clearTimeout(id);
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
    return await res.text();
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

function extractFromHtml(html: string, url: string) {
  const root = parse(html);

  let brandName: string | null = null;
  const ogSiteName = root.querySelector('meta[property="og:site_name"]');
  if (ogSiteName && ogSiteName.getAttribute('content')) brandName = ogSiteName.getAttribute('content')!.trim();
  else {
    const ogTitle = root.querySelector('meta[property="og:title"]');
    if (ogTitle && ogTitle.getAttribute('content')) brandName = ogTitle.getAttribute('content')!.trim();
    else if (root.querySelector('title')) brandName = root.querySelector('title')!.text.trim();
  }

  let email: string | null = null;
  const mailAnchors = root.querySelectorAll('a[href^="mailto:"]');
  if (mailAnchors && mailAnchors.length > 0) {
    for (const a of mailAnchors) {
      const href = a.getAttribute('href');
      if (!href) continue;
      const candidate = href.replace(/^mailto:/i, '').split('?')[0].trim();
      if (candidate) { email = candidate; break; }
    }
  } else {
    const bodyText = root.text;
    const match = bodyText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    if (match) email = match[0];
  }

  const paragraphs = root.querySelectorAll('p').slice(0, 60);
  const pText = paragraphs.map(p => p.text.trim()).filter(Boolean).join('\n\n');

  let metaDesc = '';
  const metaDescription = root.querySelector('meta[name="description"]') || root.querySelector('meta[property="og:description"]');
  if (metaDescription && metaDescription.getAttribute('content')) metaDesc = metaDescription.getAttribute('content')!.trim();

  const content = [metaDesc, pText].filter(Boolean).join('\n\n');

  if (!brandName) {
    try {
      const u = new URL(url);
      brandName = u.hostname.replace(/^www\./, '');
    } catch {
      brandName = url;
    }
  }

  return { brandName, email, content };
}

async function ensureTable() {
  const createSQL = `
    CREATE TABLE IF NOT EXISTS blogs (
      id SERIAL PRIMARY KEY,
      company_url TEXT NOT NULL,
      email_id TEXT,
      brand_name TEXT,
      blog TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
  `;
  await pool.query(createSQL);
  // Ensure topic column exists on legacy tables
  await pool.query('ALTER TABLE blogs ADD COLUMN IF NOT EXISTS topic TEXT');
}

async function generateBlog({ topic, brandName, scrapedContent, providedEmail, providedBrand, brandContext }: {
  topic: string; brandName: string | null; scrapedContent: string; providedEmail: string | null; providedBrand?: string | null; brandContext?: string;
}) {
  const systemPrompt = `You are an expert content strategist specializing in AEO (Answer Engine Optimization) and SEO. 
Your goal is to write high-quality, authoritative content that ranks well in traditional search engines (Google) and is easily parsed by AI answer engines (ChatGPT, Perplexity, Gemini).

AEO Principles to follow:
- Structure content for direct answers (What is X? How does Y work?).
- Use clear, hierarchical headings (H1, H2, H3).
- Include bullet points and numbered lists for scannability.
- Define key entities and concepts early in the content.
- Adopt a "Question & Answer" style where appropriate.

SEO Principles to follow:
- Naturally incorporate relevant keywords from the context.
- Ensure high readability and engagement.
- Maintain a professional, brand-aligned tone.

Use ONLY the facts provided in the source material. Do not hallucinate. Output in clean Markdown.`;

  let userPrompt = `
Topic: ${topic}
Brand (provided): ${providedBrand || brandName}
Email (provided): ${providedEmail || 'N/A'}

Scraped Content (Source Facts):
${(scrapedContent || '').slice(0, 12000)}
`;

  if (brandContext) {
    userPrompt += `\nBrand Context (Entity Details):
${brandContext}
Use this context to ensure entity consistency and relevance.
`;
  }

  userPrompt += `
Write a comprehensive, AEO-optimized blog post for "${providedBrand || brandName}" about "${topic}".

Requirements:
1. **Meta Description**: Start with a "Meta Description" heading (150-160 chars), optimized for clicks.
2. **Introduction**: concise, hooking the reader, defining the core concept immediately (good for featured snippets).
3. **Structure**: Use H2s for main questions/sections and H3s for sub-points.
4. **Direct Answers**: Where the topic asks a question, answer it directly in the first paragraph of that section.
5. **Formatting**: Use bolding for key terms and lists for steps or features.
6. **Conclusion**: Summary with a call-to-action (implied).
7. **Citations**: Cite specific scraped facts inline using [source] where applicable.

Do NOT include any "Note: generic information added" disclaimer.
`;

  const model = getProviderModel('anthropic', CLAUDE_DEFAULT_MODEL);
  if (!model) throw new Error('Claude model not available or API key not configured');

  const { text } = await generateText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0, // Keep it factual
    maxTokens: Math.min(MAX_TOKENS, 4000)
  });

  if (!text) throw new Error('AI returned empty response');
  return text;
}

export async function POST(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Server misconfiguration: missing DATABASE_URL' }, { status: 500 });
    }

    const body = await request.json();
    const { company_url, topic, brand_name: providedBrand, email_id: providedEmail } = body ?? {} as any;

    if (!company_url || !topic) {
      return NextResponse.json({ error: 'Missing required fields: company_url and topic' }, { status: 400 });
    }

    let html: string;
    try {
      html = await fetchHtml(company_url);
    } catch (err: any) {
      return NextResponse.json({ error: `Failed to fetch company_url: ${err.message}` }, { status: 400 });
    }

    const { brandName: scrapedBrand, email: scrapedEmail, content: scrapedContent } = extractFromHtml(html, company_url);
    const finalBrand = providedBrand || scrapedBrand;
    let finalEmail = providedEmail || scrapedEmail || null;
    let userId = null;

    // Prefer session email if available and get userId
    try {
      // @ts-ignore - NextRequest type not available here; using any headers
      const session = await auth.api.getSession({ headers: (request as any).headers });
      const sessionEmail = session?.user?.email || null;
      userId = session?.user?.id || null;
      if (sessionEmail) finalEmail = sessionEmail;
    } catch {}

    // Fetch richer brand context if possible
    let brandContext = '';
    if (userId && providedBrand) {
        try {
            const brands = await db
                .select()
                .from(brandprofile)
                .where(and(eq(brandprofile.userId, userId), eq(brandprofile.name, providedBrand)))
                .limit(1);

            if (brands.length > 0) {
                const b = brands[0];
                const keywords = (b.scrapedData as any)?.keywords || [];
                const description = b.description || (b.scrapedData as any)?.description || '';
                
                brandContext = `
Industry: ${b.industry}
Location: ${b.location}
Description: ${description}
Keywords: ${keywords.join(', ')}
Competitors: ${(b.scrapedData as any)?.competitors?.join(', ') || ''}
`;
                console.log('Found brand profile context for blog generation:', providedBrand);
            }
        } catch (err) {
            console.warn('Failed to fetch brand profile for blog context:', err);
        }
    }


    await ensureTable();

    let blogText: string;
    try {
      console.log("Generating blog for:", finalBrand, "on topic:", topic);
      blogText = await generateBlog({
        topic,
        brandName: scrapedBrand,
        scrapedContent,
        providedEmail: finalEmail,
        providedBrand: providedBrand,
        brandContext,
      });
    } catch (err: any) {
      console.error('AI error:', err);
      return NextResponse.json({ error: 'AI generation failed', detail: err.message ?? String(err) }, { status: 500 });
    }

    const insertSQL = `
      INSERT INTO blogs (company_url, email_id, brand_name, topic, blog)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, created_at;
    `;
    const values = [company_url, finalEmail, finalBrand, topic, blogText];
    const resIns = await pool.query(insertSQL, values);
    const row = resIns.rows[0];

    return NextResponse.json({
      id: row.id,
      created_at: row.created_at,
      blog: blogText,
      topic,
    }, { status: 201 });
  } catch (err: any) {
    console.error('Unexpected error in API:', err);
    return NextResponse.json({ error: 'Internal server error', detail: String(err) }, { status: 500 });
  }
}

