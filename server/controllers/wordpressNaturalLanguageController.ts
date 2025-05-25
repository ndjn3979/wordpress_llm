import { Request, RequestHandler } from 'express';
import { ServerError } from '../server/types';

// Helper function to detect plugins mentioned in the query
function detectPluginsInQuery(query: string): string[] {
  const pluginPatterns = {
    'WooCommerce': /\b(woo|woocommerce|shop|store|ecommerce|checkout|payment|order)\b/i,
    'Mailchimp': /\b(mailchimp|email marketing|newsletter|sync|mailing list)\b/i,
    'Yoast SEO': /\b(yoast|seo|search engine optimization)\b/i,
    'Elementor': /\b(elementor|page builder|visual editor|editor)\b/i,
    'Stripe': /\b(stripe|payment gateway|credit card|billing)\b/i,
    'Gutenberg': /\b(gutenberg|block editor|blocks|new editor)\b/i,
    'Security Plugin': /\b(security|firewall|locked out|blocked|malware)\b/i,
    'Caching Plugin': /\b(cache|caching|performance|speed|optimization)\b/i,
    'Backup Plugin': /\b(backup|restore|export|import)\b/i
  };

  const detectedPlugins: string[] = [];
  for (const [plugin, pattern] of Object.entries(pluginPatterns)) {
    if (pattern.test(query)) {
      detectedPlugins.push(plugin);
    }
  }

  return detectedPlugins;
}

// Helper function to detect problem types in the query
function detectProblemTypes(query: string): string[] {
  const problemPatterns = {
    'sync_issue': /\b(sync|syncing|not updating|not appearing|not working|failed sync)\b/i,
    'conflict': /\b(conflict|not working|broken|error|issue|problem|bug)\b/i,
    'performance': /\b(slow|timeout|memory|performance|lag|speed|loading)\b/i,
    'payment_issue': /\b(payment|checkout|transaction|billing|gateway|credit card)\b/i,
    'security_lockout': /\b(locked out|can\'t access|blocked|security|firewall)\b/i,
    'editor_issue': /\b(editor|won\'t load|not loading|can\'t edit|green button)\b/i,
    'cache_issue': /\b(cache|stale|outdated|not updating|wrong version)\b/i,
    'backup_issue': /\b(backup|restore|failed|corrupted|won\'t complete)\b/i,
    'site_crash': /\b(white screen|crash|down|not loading|fatal error|wsod)\b/i
  };

  const detectedProblems: string[] = [];
  for (const [problem, pattern] of Object.entries(problemPatterns)) {
    if (pattern.test(query)) {
      detectedProblems.push(problem);
    }
  }

  return detectedProblems;
}

// Helper function to determine urgency level
function detectUrgencyLevel(query: string): 'emergency' | 'high' | 'medium' | 'low' {
  const emergencyKeywords = /\b(white screen|site down|crashed|can\'t access|locked out|fatal error|wsod)\b/i;
  const highUrgencyKeywords = /\b(payment|checkout|not working|broken|error|urgent)\b/i;
  const mediumUrgencyKeywords = /\b(slow|performance|issue|problem|conflict)\b/i;

  if (emergencyKeywords.test(query)) return 'emergency';
  if (highUrgencyKeywords.test(query)) return 'high';
  if (mediumUrgencyKeywords.test(query)) return 'medium';
  return 'low';
}

export const parseWordPressQuery: RequestHandler = async (
  req: Request<unknown, unknown, Record<string, unknown>>,
  res,
  next
) => {
  console.log("1. WordPress query parsing started");

  if (!req.body.naturalLanguageQuery) {
    const error: ServerError = {
      log: 'WordPress troubleshooting query not provided',
      status: 400,
      message: { err: 'Please provide a troubleshooting question' },
    };
    return next(error);
  }

  const { naturalLanguageQuery } = req.body;

  if (typeof naturalLanguageQuery !== 'string') {
    const error: ServerError = {
      log: 'WordPress query is not a string',
      status: 400,
      message: { err: 'Query must be a text string' },
    };
    return next(error);
  }

  try {
    // Clean up the input
    const cleanedQuery = naturalLanguageQuery.trim();
    console.log("2. Cleaned query:", cleanedQuery);

    // Detect plugins mentioned in the query
    const detectedPlugins = detectPluginsInQuery(cleanedQuery);
    console.log("3. Detected plugins:", detectedPlugins);

    // Detect problem types
    const detectedProblems = detectProblemTypes(cleanedQuery);
    console.log("4. Detected problems:", detectedProblems);

    // Detect urgency level
    const urgencyLevel = detectUrgencyLevel(cleanedQuery);
    console.log("5. Urgency level:", urgencyLevel);

    // Store processed query data in res.locals
    res.locals.naturalLanguageQuery = cleanedQuery;
    res.locals.queryContext = {
      detectedPlugins,
      detectedProblems,
      urgencyLevel,
      originalQuery: naturalLanguageQuery
    };

    console.log("6. Query context prepared for next middleware");
    return next();

  } catch (error: any) {
    const serverError: ServerError = {
      log: `Error parsing WordPress query: ${error.message}`,
      status: 500,
      message: { err: 'An error occurred while analyzing your question' },
    };
    return next(serverError);
  }
};