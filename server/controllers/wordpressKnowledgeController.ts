import { RequestHandler } from 'express';
import { ServerError } from '../types';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define interfaces for our WordPress troubleshooting dataset
interface TroubleshootingArticle {
  article_id: string;
  title: string;
  category: string;
  scenario: string;
  problem_description: string;
  symptoms: string[];
  solution_steps: string[];
  error_codes?: string[];
  common_errors?: string[];
  prevention_tips?: string[];
  tools_mentioned?: string[];
  source_url?: string;
}

interface IntegrationScenario {
  scenario_id: string;
  name: string;
  description: string;
  common_symptoms: string[];
  typical_causes: string[];
}

interface WordPressKnowledgeBase {
  metadata: {
    title: string;
    description: string;
    total_articles: number;
    categories: string[];
  };
  integration_scenarios: IntegrationScenario[];
  troubleshooting_articles: TroubleshootingArticle[];
  common_error_patterns: Record<string, {
    description: string;
    examples: string[];
    typical_solutions: string[];
  }>;
  search_intent_examples: Array<{
    user_query: string;
    intent: string;
    relevant_articles: string[];
    expected_response: string;
  }>;
}

// Load the WordPress troubleshooting dataset
const wordpressDatasetPath = path.join(__dirname, '../data', 'dataset.json');
let wordpressKnowledgeBase: WordPressKnowledgeBase | null = null;

try {
  if (fs.existsSync(wordpressDatasetPath)) {
    wordpressKnowledgeBase = JSON.parse(fs.readFileSync(wordpressDatasetPath, 'utf8'));
    console.log(`Loaded WordPress knowledge base with ${wordpressKnowledgeBase?.troubleshooting_articles.length} articles`);
  } else {
    console.warn(`WordPress dataset file not found at ${wordpressDatasetPath}`);
  }
} catch (error) {
  console.warn("Could not load WordPress knowledge base:", error);
}

// Helper function to find relevant articles based on query context
function findRelevantArticles(
  detectedPlugins: string[], 
  detectedProblems: string[], 
  query: string
): Array<{ article: TroubleshootingArticle; score: number }> {
  if (!wordpressKnowledgeBase) {
    return [];
  }

  const relevantArticles: Array<{ article: TroubleshootingArticle; score: number }> = [];

  for (const article of wordpressKnowledgeBase.troubleshooting_articles) {
    let score = 0;

    // Score based on plugin matches
    for (const plugin of detectedPlugins) {
      const pluginKey = plugin.toLowerCase().replace(/\s+/g, '_');
      if (article.scenario.toLowerCase().includes(pluginKey)) {
        score += 0.4;
      }
      if (article.title.toLowerCase().includes(plugin.toLowerCase())) {
        score += 0.3;
      }
    }

    // Score based on problem type matches
    for (const problem of detectedProblems) {
      const problemKeyword = problem.replace('_', ' ');
      if (article.title.toLowerCase().includes(problemKeyword)) {
        score += 0.3;
      }
      if (article.problem_description.toLowerCase().includes(problemKeyword)) {
        score += 0.2;
      }
    }

    // Score based on symptom matches
    const queryLower = query.toLowerCase();
    for (const symptom of article.symptoms) {
      if (queryLower.includes(symptom.toLowerCase())) {
        score += 0.2;
      }
    }

    // Score based on general keyword matches
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 3);
    const articleText = (
      article.title + ' ' + 
      article.problem_description + ' ' + 
      article.symptoms.join(' ') + ' ' + 
      article.solution_steps.join(' ')
    ).toLowerCase();

    for (const word of queryWords) {
      if (articleText.includes(word)) {
        score += 0.1;
      }
    }

    if (score > 0) {
      relevantArticles.push({ article, score });
    }
  }

  // Sort by score and return
  relevantArticles.sort((a, b) => b.score - a.score);
  return relevantArticles;
}

// Helper function to find relevant scenarios
function findRelevantScenarios(
  detectedPlugins: string[], 
  detectedProblems: string[]
): Array<{ scenario: IntegrationScenario; score: number }> {
  if (!wordpressKnowledgeBase) {
    return [];
  }

  const relevantScenarios: Array<{ scenario: IntegrationScenario; score: number }> = [];

  for (const scenario of wordpressKnowledgeBase.integration_scenarios) {
    let score = 0;

    // Score based on plugin matches in scenario name
    for (const plugin of detectedPlugins) {
      if (scenario.name.toLowerCase().includes(plugin.toLowerCase())) {
        score += 0.5;
      }
    }

    // Score based on problem type matches in symptoms/causes
    for (const problem of detectedProblems) {
      const problemText = problem.replace('_', ' ');
      const scenarioText = (
        scenario.description + ' ' + 
        scenario.common_symptoms.join(' ') + ' ' + 
        scenario.typical_causes.join(' ')
      ).toLowerCase();
      
      if (scenarioText.includes(problemText)) {
        score += 0.3;
      }
    }

    if (score > 0) {
      relevantScenarios.push({ scenario, score });
    }
  }

  relevantScenarios.sort((a, b) => b.score - a.score);
  return relevantScenarios;
}

export const searchWordPressKnowledgeBase: RequestHandler = async (
  _req,
  res,
  next
) => {
  console.log("7. Starting knowledge base search");

  const { naturalLanguageQuery, queryContext } = res.locals;

  if (!naturalLanguageQuery || !queryContext) {
    const error: ServerError = {
      log: 'Knowledge base search middleware did not receive processed query',
      status: 500,
      message: { err: 'An error occurred before searching knowledge base' },
    };
    return next(error);
  }

  try {
    const { detectedPlugins, detectedProblems } = queryContext;

    // Find relevant articles
    const relevantArticles = findRelevantArticles(
      detectedPlugins, 
      detectedProblems, 
      naturalLanguageQuery
    );
    console.log(`8. Found ${relevantArticles.length} relevant articles`);

    // Find relevant scenarios
    const relevantScenarios = findRelevantScenarios(
      detectedPlugins, 
      detectedProblems
    );
    console.log(`9. Found ${relevantScenarios.length} relevant scenarios`);

    // Store search results in res.locals
    res.locals.searchResults = {
      articles: relevantArticles.slice(0, 3), // Top 3 articles
      scenarios: relevantScenarios.slice(0, 2), // Top 2 scenarios
      totalArticlesFound: relevantArticles.length,
      totalScenariosFound: relevantScenarios.length
    };

    console.log("10. Search results prepared for OpenAI");
    return next();

  } catch (error: any) {
    const serverError: ServerError = {
      log: `Error searching WordPress knowledge base: ${error.message}`,
      status: 500,
      message: { err: 'An error occurred while searching for solutions' },
    };
    return next(serverError);
  }
};