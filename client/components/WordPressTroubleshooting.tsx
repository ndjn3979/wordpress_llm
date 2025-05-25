import React, { useState } from 'react';
import './WordPressTroubleshooting.css';

interface WordPressResponse {
  success: boolean;
  data: {
    needsClarification?: boolean;
    clarifyingQuestions?: {
      questions: string[];
      originalQuery: string;
      suggestions: string[];
    };
    solution?: string;
    analysis: {
      detectedPlugins: string[];
      detectedProblems: string[];
      urgencyLevel: string;
      isEmergency: boolean;
      vaguenessReasons?: string[];
    };
    knowledgeBase?: {
      articlesConsulted: number;
      scenariosMatched: number;
      totalArticlesFound: number;
      totalScenariosFound: number;
    };
    relatedArticles?: Array<{
      title: string;
      relevanceScore: string;
      category: string;
      scenario: string;
    }>;
    quickActions?: string[];
    additionalResources?: Array<{
      name: string;
      url: string;
      description: string;
    }>;
    metadata: {
      timestamp: string;
      processingTime?: string;
      responseType: 'clarifying_questions' | 'solution';
      responseId: string;
    };
  };
}

const WordPressTroubleshooting: React.FC = () => {
  const [query, setQuery] = useState<string>('');
  const [response, setResponse] = useState<WordPressResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [conversationMode, setConversationMode] = useState<boolean>(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{
    type: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>>([]);

  const exampleQueries = [
    "My WooCommerce orders aren't syncing to Mailchimp",
    "White screen of death after plugin update",
    "Elementor editor won't load after installing Yoast",
    "Stripe payments failing at checkout",
    "My site is slow since installing caching plugin",
    "Security plugin locked me out of admin"
  ];

  // Helper function to format clarifying questions
  const formatClarifyingQuestions = (questions: any) => {
    if (!questions) return 'I need more details.';
    
    return `🤔 I need more details to help you better:

${questions.questions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}

💡 Tips for better help:
• Include specific error messages
• Mention which plugins you're using
• Describe when the problem started
• Include what you were trying to do

Please provide more details above and submit again.`;
  };

  // Helper function to format solution
  const formatSolution = (solution: string) => {
    if (!solution) return 'Solution provided';
    
    return solution
      .replace(/\*\*(.*?)\*\*/g, '• $1') // Convert **headers** to bullets
      .replace(/(\d+\.\s)/g, '\n$1') // Add line breaks before numbered items
      .replace(/\n\s*\n/g, '\n\n') // Clean up multiple line breaks
      .trim();
  };

  const handleSubmit = async (e: React.FormEvent, isFollowUp: boolean = false) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    
    // Add user message to conversation history
    const newUserMessage = {
      type: 'user' as const,
      content: query,
      timestamp: new Date().toISOString()
    };
    setConversationHistory(prev => [...prev, newUserMessage]);

    try {
      const result = await fetch('/api/wordpress/troubleshoot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          naturalLanguageQuery: isFollowUp ? 
            `Previous query: "${response?.data.clarifyingQuestions?.originalQuery}"\n\nAdditional details: ${query}` : 
            query 
        })
      });

      if (!result.ok) {
        throw new Error(`Server error: ${result.status}`);
      }

      const data: WordPressResponse = await result.json();
      setResponse(data);
      
      // Add assistant response to conversation history with proper formatting
      const assistantContent = data.data.needsClarification ? 
        formatClarifyingQuestions(data.data.clarifyingQuestions) :
        formatSolution(data.data.solution || 'Solution provided');
        
      setConversationHistory(prev => [...prev, {
        type: 'assistant',
        content: assistantContent,
        timestamp: new Date().toISOString()
      }]);

      // Set conversation mode if we got clarifying questions
      if (data.data.needsClarification) {
        setConversationMode(true);
      } else {
        setConversationMode(false);
      }
      
      setQuery(''); // Clear input after submission
    } catch (err: any) {
      setError(err.message || 'An error occurred while getting help');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExampleClick = (exampleQuery: string) => {
    setQuery(exampleQuery);
    setConversationMode(false);
    setConversationHistory([]);
    setResponse(null);
  };

  return (
    <div className="wordpress-troubleshooting">
      <div className="header">
        <h1>🔧 WordPress Plugin Troubleshooting</h1>
        <p>Describe your WordPress issue and get instant AI-powered solutions</p>
      </div>

      {conversationMode && (
        <div className="conversation-mode-indicator">
          🗣️ Conversation Mode: Building on your original question
        </div>
      )}

      {conversationHistory.length > 0 && (
        <div className="conversation-history">
          <h4>💬 Conversation:</h4>
          {conversationHistory.map((message, index) => (
            <div key={index} className={`conversation-message ${message.type}`}>
              <strong>{message.type === 'user' ? 'You' : 'Assistant'}:</strong> {message.content}
              <div className="timestamp">{new Date(message.timestamp).toLocaleTimeString()}</div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e, conversationMode)} className="query-form">
        <div className="input-group">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={conversationMode ? 
              "Please provide the additional details requested above..." : 
              "Describe your WordPress issue... (e.g., 'My WooCommerce site has a white screen of death')"
            }
            rows={4}
            className="query-input"
            disabled={loading}
          />
          <button 
            type="submit" 
            disabled={loading || !query.trim()}
            className={`submit-button ${loading ? 'loading' : ''}`}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                {conversationMode ? 'Getting Better Solution...' : 'Getting Help...'}
              </>
            ) : (
              conversationMode ? '🔍 Get Better Solution' : '🔍 Get Solution'
            )}
          </button>
        </div>
      </form>

      {!conversationMode && (
        <div className="examples">
          <h3>💡 Try these examples:</h3>
          <div className="example-buttons">
            {exampleQueries.map((example, index) => (
              <button
                key={index}
                onClick={() => handleExampleClick(example)}
                className="example-button"
                disabled={loading}
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="error-message">
          <h3>❌ Error</h3>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};

export default WordPressTroubleshooting;