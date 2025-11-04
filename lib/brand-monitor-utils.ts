import { Company } from './types';
import { AI_COMPETITOR_DETECTION_PROMPT } from '@/prompts';
export function validateUrl(url: string): boolean {
    try {
        const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);

        // Basic domain validation - must have at least one dot and valid TLD
        const hostname = urlObj.hostname;
        const parts = hostname.split('.');

        // Must have at least domain.tld format
        if (parts.length < 2) return false;

        // Last part (TLD) must be at least 2 characters and contain only letters
        const tld = parts[parts.length - 1];
        if (tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) return false;

        // Domain parts should contain valid characters (allow numbers and hyphens)
        for (const part of parts) {
            if (!/^[a-zA-Z0-9-]+$/.test(part) || part.startsWith('-') || part.endsWith('-')) {
                return false;
            }
        }

        return true;
    } catch (e) {
        console.error('URL validation error:', e);
        return false;
    }
}

export function validateCompetitorUrl(url: string): string | undefined {
    if (!url) return undefined;

    // Remove trailing slashes
    let cleanUrl = url.trim().replace(/\/$/, '');

    // Ensure the URL has a protocol
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'https://' + cleanUrl;
    }

    try {
        const urlObj = new URL(cleanUrl);
        const hostname = urlObj.hostname;

        // Return clean URL without protocol for display
        return hostname + (urlObj.pathname !== '/' ? urlObj.pathname : '');
    } catch {
        return undefined;
    }
}

export function normalizeCompetitorName(name: string): string {
    const normalized = name.toLowerCase().trim();

    // Normalize common variations to canonical names
    const nameNormalizations: { [key: string]: string } = {
        'amazon web services': 'aws',
        'amazon web services (aws)': 'aws',
        'amazon aws': 'aws',
        'microsoft azure': 'azure',
        'google cloud platform': 'google cloud',
        'google cloud platform (gcp)': 'google cloud',
        'gcp': 'google cloud',
        'digital ocean': 'digitalocean',
        'beautiful soup': 'beautifulsoup',
        'bright data': 'brightdata',
    };

    return nameNormalizations[normalized] || normalized;
}

export function assignUrlToCompetitor(competitorName: string): string | undefined {
    // Comprehensive URL mapping for common competitors
    const urlMappings: { [key: string]: string } = {
        // Web scraping tools
        'apify': 'apify.com',
        'scrapy': 'scrapy.org',
        'octoparse': 'octoparse.com',
        'parsehub': 'parsehub.com',
        'diffbot': 'diffbot.com',
        'import.io': 'import.io',
        'bright data': 'brightdata.com',
        'zyte': 'zyte.com',
        'puppeteer': 'pptr.dev',
        'playwright': 'playwright.dev',
        'selenium': 'selenium.dev',
        'beautiful soup': 'pypi.org/project/beautifulsoup4',
        'scrapfly': 'scrapfly.io',
        'crawlbase': 'crawlbase.com',
        'webharvy': 'webharvy.com',

        // AI companies
        'openai': 'openai.com',
        'anthropic': 'anthropic.com',
        'google ai': 'ai.google',
        'microsoft azure': 'azure.microsoft.com',
        'ibm watson': 'ibm.com/watson',
        'amazon aws': 'aws.amazon.com',
        'perplexity': 'perplexity.ai',
        'claude': 'anthropic.com',
        'chatgpt': 'openai.com',
        'gemini': 'gemini.google.com',

        // SaaS platforms
        'salesforce': 'salesforce.com',
        'hubspot': 'hubspot.com',
        'zendesk': 'zendesk.com',
        'slack': 'slack.com',
        'atlassian': 'atlassian.com',
        'monday.com': 'monday.com',
        'notion': 'notion.so',
        'airtable': 'airtable.com',

        // E-commerce
        'shopify': 'shopify.com',
        'woocommerce': 'woocommerce.com',
        'magento': 'magento.com',
        'bigcommerce': 'bigcommerce.com',
        'squarespace': 'squarespace.com',
        'wix': 'wix.com',

        // Cloud/hosting
        'vercel': 'vercel.com',
        'netlify': 'netlify.com',
        'aws': 'aws.amazon.com',
        'google cloud': 'cloud.google.com',
        'azure': 'azure.microsoft.com',
        'heroku': 'heroku.com',
        'digitalocean': 'digitalocean.com',
        'cloudflare': 'cloudflare.com'
    };

    const normalized = competitorName.toLowerCase().trim();
    if (!normalized) {
        return undefined;
    }

    if (urlMappings[normalized]) {
        return urlMappings[normalized];
    }

    // Intelligent fallback: attempt to derive a plausible domain from the company name
    const cleaned = normalized
        .replace(/&/g, ' and ')
        .replace(/\b(the|inc|llc|ltd|co|corp|company|corporation)\b/g, ' ')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (!cleaned) {
        return undefined;
    }

    const compact = cleaned.replace(/\s+/g, '');

    // Avoid returning obviously invalid guesses
    if (compact.length < 3) {
        return undefined;
    }

    return `${compact}.com`;
}

export function detectServiceType(company: Company): string {
    const desc = (company.description || '').toLowerCase();
    const content = (company.scrapedData?.mainContent || '').toLowerCase();
    const companyName = (company.name || '').toLowerCase();

    // Check for specific industries first
    if (desc.includes('beverage') || desc.includes('drink') || desc.includes('cola') || desc.includes('soda') ||
        content.includes('beverage') || content.includes('refreshment') || companyName.includes('coca') || companyName.includes('pepsi')) {
        return 'beverage brand';
    } else if (desc.includes('restaurant') || desc.includes('food') || desc.includes('dining') ||
        content.includes('menu') || content.includes('restaurant')) {
        return 'restaurant';
    } else if (desc.includes('retail') || desc.includes('store') || desc.includes('shopping') ||
        content.includes('retail') || content.includes('shopping')) {
        return 'retailer';
    } else if (desc.includes('bank') || desc.includes('financial') || desc.includes('finance') ||
        content.includes('banking') || content.includes('financial services')) {
        return 'financial service';
    } else if (desc.includes('scraping') || desc.includes('crawl') || desc.includes('extract') ||
        content.includes('web scraping') || content.includes('data extraction')) {
        return 'web scraper';
    } else if (desc.includes('ai') || desc.includes('artificial intelligence') || desc.includes('llm') ||
        content.includes('machine learning') || content.includes('ai-powered')) {
        return 'AI tool';
    } else if (desc.includes('hosting') || desc.includes('deploy') || desc.includes('cloud') ||
        content.includes('deployment') || content.includes('infrastructure')) {
        return 'hosting platform';
    } else if (desc.includes('e-commerce') || desc.includes('online store') || desc.includes('marketplace')) {
        return 'e-commerce platform';
    } else if (desc.includes('software') || desc.includes('saas') || desc.includes('platform')) {
        return 'software';
    }
    // More generic default
    return 'brand';
}
