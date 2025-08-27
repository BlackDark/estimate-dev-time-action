import OpenAI from 'openai';
import { EstimationRequest, EstimationResponse, SkillLevel } from './types';
import { FileTypeAnalysis } from './diff-filter';

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
    request: EstimationRequest,
    fileTypeAnalysis?: FileTypeAnalysis
  ): Promise<EstimationResponse> {
    const prompt = this.buildPrompt(request.prChanges, request.skillLevels, fileTypeAnalysis);

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

  private buildPrompt(prChanges: string, skillLevels: SkillLevel[], fileTypeAnalysis?: FileTypeAnalysis): string {
    
    let fileContextSection = '';
    if (fileTypeAnalysis) {
      const fileTypeSummary = [];
      if (fileTypeAnalysis.codeFiles.length > 0) {
        fileTypeSummary.push(`**Code files (${fileTypeAnalysis.codeFiles.length}):** ${fileTypeAnalysis.codeFiles.slice(0, 5).join(', ')}${fileTypeAnalysis.codeFiles.length > 5 ? '...' : ''}`);
      }
      if (fileTypeAnalysis.configFiles.length > 0) {
        fileTypeSummary.push(`**Configuration files (${fileTypeAnalysis.configFiles.length}):** ${fileTypeAnalysis.configFiles.slice(0, 3).join(', ')}${fileTypeAnalysis.configFiles.length > 3 ? '...' : ''}`);
      }
      if (fileTypeAnalysis.testFiles.length > 0) {
        fileTypeSummary.push(`**Test files (${fileTypeAnalysis.testFiles.length}):** ${fileTypeAnalysis.testFiles.slice(0, 3).join(', ')}${fileTypeAnalysis.testFiles.length > 3 ? '...' : ''}`);
      }
      if (fileTypeAnalysis.buildFiles.length > 0) {
        fileTypeSummary.push(`**Build/CI files (${fileTypeAnalysis.buildFiles.length}):** ${fileTypeAnalysis.buildFiles.slice(0, 3).join(', ')}${fileTypeAnalysis.buildFiles.length > 3 ? '...' : ''}`);
      }
      if (fileTypeAnalysis.documentationFiles.length > 0) {
        fileTypeSummary.push(`**Documentation (${fileTypeAnalysis.documentationFiles.length}):** ${fileTypeAnalysis.documentationFiles.slice(0, 3).join(', ')}${fileTypeAnalysis.documentationFiles.length > 3 ? '...' : ''}`);
      }
      if (fileTypeAnalysis.otherFiles.length > 0) {
        fileTypeSummary.push(`**Other files (${fileTypeAnalysis.otherFiles.length}):** ${fileTypeAnalysis.otherFiles.slice(0, 3).join(', ')}${fileTypeAnalysis.otherFiles.length > 3 ? '...' : ''}`);
      }
      
      if (fileTypeSummary.length > 0) {
        fileContextSection = `

**File Type Analysis:**
${fileTypeSummary.join('\n')}

**Estimation Context Based on File Types:**
- Configuration changes typically require research time for unfamiliar tools (varies by experience)
- Code changes leverage existing patterns and team knowledge (faster implementation)
- Test files indicate comprehensive testing approach (factor in test writing/updating time)  
- Build/CI changes may require cross-system knowledge and debugging
- Documentation updates are usually straightforward but vary by complexity

`;
      }
    }

    return `
You are an experienced software engineering manager. Analyze the following PR changes and provide REALISTIC time estimates for implementing these specific changes. Focus on actual development work and avoid overestimating.

**IMPORTANT GUIDELINES:**
- Developers are FAMILIAR with this existing codebase and its patterns
- Generated files, build artifacts, and lock files have been filtered out
- Estimate ONLY the time needed to make these specific changes
- Developers can leverage existing code patterns and team knowledge
- Consider the learning curve for unfamiliar tools/technologies in the changes

**PR Changes:**
\`\`\`
${prChanges}
\`\`\`${fileContextSection}

**Skill Level Definitions:**
- **Junior**: 0-2 years experience, familiar with this codebase, but may need time to research unfamiliar tools/configs, less experience with cross-domain work
- **Senior**: 3-5 years experience, familiar with this codebase, comfortable with most common tools and patterns, good at adapting existing solutions
- **Expert**: 5+ years experience, familiar with this codebase, extensive experience across multiple tools/domains, quickly identifies optimal approaches

**Time Estimation Guidelines (for developers familiar with codebase):**
- Simple config/documentation changes: 15-30 minutes
- Function modifications with existing patterns: 30 minutes - 2 hours
- New features using familiar tools: 2-6 hours
- Configuration with unfamiliar tools: 4-8 hours (research + implementation)
- Cross-domain work (CI/CD + backend + frontend): Add 50-100% time for junior developers
- Complex integrations or new tool adoption: 1-2 days

**Consider for each estimate:**
1. Time to understand the specific changes needed (quick since familiar with codebase)
2. Research time for unfamiliar tools/technologies (varies greatly by experience level)
3. Implementation time (main component)
4. Testing and debugging (includes learning new tool behaviors)
5. Integration issues with existing systems

**Experience Level Impact:**
- **Junior**: May need 2-3x more time for unfamiliar tools, cross-domain changes take longer
- **Senior**: Efficient with known tools, moderate research time for new ones
- **Expert**: Minimal research time, can quickly adapt patterns across domains

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
