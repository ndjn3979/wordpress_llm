export interface ServerError {
  log: string;
  status: number;
  message: { err: string };
  stack?: string;
}

// WordPress-specific types
export interface WordPressQueryContext {
  detectedPlugins: string[];
  detectedProblems: string[];
  urgencyLevel: 'emergency' | 'high' | 'medium' | 'low';
  originalQuery: string;
}

export interface TroubleshootingArticle {
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

export interface IntegrationScenario {
  scenario_id: string;
  name: string;
  description: string;
  common_symptoms: string[];
  typical_causes: string[];
}

export interface WordPressKnowledgeBase {
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

export interface SearchResult {
  article: TroubleshootingArticle;
  score: number;
}

export interface ScenarioResult {
  scenario: IntegrationScenario;
  score: number;
}

export interface WordPressSearchResults {
  articles: SearchResult[];
  scenarios: ScenarioResult[];
  totalArticlesFound: number;
  totalScenariosFound: number;
}

export interface WordPressSolution {
  solution: string;
  metadata: {
    detectedPlugins: string[];
    detectedProblems: string[];
    urgencyLevel: string;
    articlesUsed: number;
    scenariosUsed: number;
    isEmergency: boolean;
    timestamp: string;
  };
}

export interface AdditionalResource {
  name: string;
  url: string;
  description: string;
}

export interface WordPressResponse {
  solution: string;
  analysis: {
    detectedPlugins: string[];
    detectedProblems: string[];
    urgencyLevel: string;
    isEmergency: boolean;
  };
  knowledgeBase: {
    articlesConsulted: number;
    scenariosMatched: number;
    totalArticlesFound: number;
    totalScenariosFound: number;
  };
  relatedArticles: Array<{
    title: string;
    relevanceScore: string;
    category: string;
    scenario: string;
  }>;
  quickActions: string[];
  additionalResources: AdditionalResource[];
  metadata: {
    timestamp: string;
    processingTime: string;
    responseId: string;
  };
}

export interface ClarifyingQuestions {
  questions: string[];
  originalQuery: string;
  vaguenessReasons: string[];
  detectedPlugins: string[];
  detectedProblems: string[];
}

export interface WordPressResponseWithQuestions extends WordPressResponse {
  clarifyingQuestions?: {
    questions: string[];
    originalQuery: string;
    suggestions: string[];
  };
}

// Express.js extended types for res.locals
declare global {
  namespace Express {
    interface Locals {
      // WordPress RAG system
      naturalLanguageQuery?: string;
      queryContext?: WordPressQueryContext;
      searchResults?: WordPressSearchResults;
      wordPressSolution?: WordPressSolution;
      formattedResponse?: WordPressResponse;
      
      // NEW: Clarifying questions
      clarifyingQuestions?: ClarifyingQuestions;
      skipToResponse?: boolean;
    }
  }
}