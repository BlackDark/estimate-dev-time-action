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
        throw new Error(
          `OpenRouter API error: ${error.status} - ${error.message}`
        );
      }
      throw error;
    }
  }

  private buildPrompt(prChanges: string, skillLevels: SkillLevel[]): string {
    const levelsText = skillLevels.join(', ');

    return `
Analyze the following PR changes and estimate how long it would take developers of different skill levels to implement these changes from scratch.

**PR Changes:**
\`\`\`
${prChanges}
\`\`\`

Please provide time estimates for the following skill levels: ${levelsText}

**Skill Level Definitions:**
- **Junior**: 0-2 years experience, needs guidance, focuses on basic implementation
- **Senior**: 3-7 years experience, works independently, considers edge cases and best practices
- **Expert**: 8+ years experience, optimizes for performance, maintainability, and system design

For each skill level, consider:
1. Time to understand the requirements
2. Time to research and plan the implementation
3. Time to write the code
4. Time for testing and debugging
5. Time for code review iterations

**Response Format (JSON):**
\`\`\`json
{
  "estimations": {
    ${skillLevels
      .map(
        (level) => `
    "${level}": {
      "timeEstimate": "X hours/days",
      "reasoning": "Brief explanation of the estimate",
      "complexity": "Low/Medium/High"
    }`
      )
      .join(',')}
  }
}
\`\`\`

Be realistic and consider that this includes all aspects of development, not just coding time.
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
