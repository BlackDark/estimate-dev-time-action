import OpenAI from 'openai';
import { EstimationRequest, EstimationResponse, SkillLevel } from './types';

const DEFAULT_MODEL = 'meta-llama/llama-3.2-3b-instruct:free';

export class OpenRouterClient {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = DEFAULT_MODEL) {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com',
        'X-Title': 'PR Dev Time Estimator',
      },
    });
    this.model = model;
  }

  async estimateDevTime(
    request: EstimationRequest
  ): Promise<EstimationResponse> {
    const prompt = this.buildPrompt(request.prChanges, request.skillLevels);

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert software developer and project manager who specializes in estimating development time based on code changes. You provide accurate, realistic time estimates for different skill levels.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenRouter');
      }

      return this.parseResponse(content, request.skillLevels);
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        // Provide cleaner error messages based on status codes
        let cleanMessage = error.message;
        
        if (error.status === 401) {
          cleanMessage = 'Invalid API key. Please check your OpenRouter API key.';
        } else if (error.status === 403) {
          cleanMessage = 'Access forbidden. Please verify your OpenRouter API key permissions.';
        } else if (error.status === 404) {
          cleanMessage = `Model '${this.model}' not found. Please check the model name.`;
        } else if (error.status === 429) {
          cleanMessage = 'Rate limit exceeded. Please try again later.';
        } else if (error.status >= 500) {
          cleanMessage = 'OpenRouter service unavailable. Please try again later.';
        }
        
        throw new Error(`OpenRouter API error: ${cleanMessage}`);
      }
      
      if (error instanceof Error) {
        // Handle network errors
        if (error.message.includes('fetch')) {
          throw new Error('Network error: Unable to connect to OpenRouter API. Please check your internet connection.');
        }
      }
      
      throw error;
    }
  }

  private buildPrompt(prChanges: string, skillLevels: SkillLevel[]): string {
    const levelsText = skillLevels.join(', ');

    return `
You are an experienced software engineering manager. Analyze the following PR changes and provide REALISTIC time estimates for implementing these specific changes. Focus on actual development work and avoid overestimating.

**IMPORTANT GUIDELINES:**
- This represents changes to an EXISTING codebase, not building from scratch
- Generated files, build artifacts, and lock files have been filtered out
- Estimate ONLY the time needed to make these specific changes
- Consider that developers can copy/paste/modify existing patterns
- Most changes involve adapting existing code rather than creating new architecture

**PR Changes:**
\`\`\`
${prChanges}
\`\`\`

**Skill Level Definitions:**
- **Junior**: 0-2 years experience, slower at debugging, needs some guidance
- **Senior**: 3-7 years experience, works efficiently, knows common patterns
- **Expert**: 8+ years experience, very fast implementation, rarely gets stuck

**Time Estimation Guidelines:**
- Small config/text changes: 15-30 minutes
- Simple function modifications: 30 minutes - 2 hours  
- Adding new features: 2-8 hours
- Complex refactoring: 1-3 days
- Major architectural changes: 3-5 days

**Consider for each estimate:**
1. Understanding the existing code context (usually quick for small changes)
2. Making the actual changes (main time component)
3. Basic testing and debugging
4. Creating/updating tests if needed

**Response Format (JSON):**
\`\`\`json
{
  "estimations": {
    ${skillLevels
      .map(
        (level) => `
    "${level}": {
      "timeEstimate": "X hours" or "X days",
      "reasoning": "Brief, specific explanation focusing on the actual changes",
      "complexity": "Low/Medium/High"
    }`
      )
      .join(',')}
  }
}
\`\`\`

Be concise and realistic. Most PR changes should be measured in hours, not days.
`;
  }

  private parseResponse(
    content: string,
    skillLevels: SkillLevel[]
  ): EstimationResponse {
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;

      const parsed = JSON.parse(jsonString);

      if (!parsed.estimations) {
        throw new Error('Invalid response format: missing estimations');
      }

      const estimations = {} as Record<
        SkillLevel,
        {
          timeEstimate: string;
          reasoning: string;
          complexity: 'Low' | 'Medium' | 'High';
        }
      >;
      for (const level of skillLevels) {
        if (!parsed.estimations[level]) {
          throw new Error(`Missing estimation for ${level} level`);
        }
        estimations[level] = parsed.estimations[level];
      }

      return { estimations };
    } catch (error) {
      throw new Error(
        `Failed to parse OpenRouter response: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
