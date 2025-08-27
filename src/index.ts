import * as core from '@actions/core';
import { OpenRouterClient } from './openrouter';
import { GitHubClient } from './github';
import { formatEstimationComment } from './formatter';
import { ActionInputs, SkillLevel } from './types';

async function run(): Promise<void> {
  try {
    core.info('Starting PR development time estimation...');

    const inputs: ActionInputs = {
      openrouterApiKey: core.getInput('openrouter-api-key', { required: true }),
      model: core.getInput('model') || 'meta-llama/llama-3.2-3b-instruct:free',
      skillLevels: core.getInput('skill-levels'),
    };

    const skillLevels: SkillLevel[] = inputs.skillLevels
      ? inputs.skillLevels.split(',').map((level) => level.trim() as SkillLevel)
      : ['Junior', 'Senior', 'Expert'];

    const validSkillLevels = skillLevels.filter((level) =>
      ['Junior', 'Senior', 'Expert'].includes(level)
    );

    if (validSkillLevels.length === 0) {
      throw new Error(
        'No valid skill levels provided. Valid options: Junior, Senior, Expert'
      );
    }

    core.info(`Using skill levels: ${validSkillLevels.join(', ')}`);
    core.info(`Using model: ${inputs.model}`);

    const githubToken =
      process.env.GITHUB_TOKEN || core.getInput('github-token');
    if (!githubToken) {
      throw new Error(
        'GITHUB_TOKEN environment variable or github-token input is required'
      );
    }

    const githubClient = new GitHubClient(githubToken);
    const openrouterClient = new OpenRouterClient(
      inputs.openrouterApiKey,
      inputs.model
    );

    core.info('Fetching PR changes...');
    const prChanges = await githubClient.getPrChanges();

    core.info(
      `PR Summary: +${prChanges.additions} -${prChanges.deletions} across ${prChanges.changedFiles} files`
    );

    const changes = `
**Files Changed:** ${prChanges.changedFiles}
**Lines Added:** +${prChanges.additions}
**Lines Deleted:** -${prChanges.deletions}

**Diff:**
${prChanges.diffContent}
`.trim();

    core.info('Requesting estimation from OpenRouter...');
    const estimation = await openrouterClient.estimateDevTime({
      prChanges: changes,
      skillLevels: validSkillLevels,
      model: inputs.model!,
    });

    core.info('Formatting comment...');
    const commentContent = formatEstimationComment(
      estimation,
      validSkillLevels
    );

    core.info('Updating PR comment...');
    await githubClient.updateOrCreateComment(commentContent);

    core.info('✅ Successfully updated PR with development time estimation');

    core.setOutput('estimations', JSON.stringify(estimation.estimations));
    core.setOutput('skill-levels', validSkillLevels.join(','));
  } catch (error) {
    let errorMessage = 'Unknown error occurred';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Log additional context for debugging without exposing full stack trace to user
      core.debug(`Full error details: ${error.stack || error.toString()}`);
      
      // Provide more helpful error messages for common issues
      if (error.message.includes('GITHUB_TOKEN')) {
        errorMessage = 'GitHub token is missing or invalid. Please ensure GITHUB_TOKEN is properly configured.';
      } else if (error.message.includes('OpenRouter')) {
        errorMessage = `OpenRouter API error: ${error.message.replace(/^OpenRouter API error:\s*/, '')}`;
      } else if (error.message.includes('No response content')) {
        errorMessage = 'OpenRouter API returned empty response. Please check your API key and model configuration.';
      }
    }
    
    core.error(`❌ Action failed: ${errorMessage}`);
    core.setFailed(errorMessage);
  }
}

if (require.main === module) {
  run();
}

export { run };
export { OpenRouterClient } from './openrouter';
export { GitHubClient } from './github';
