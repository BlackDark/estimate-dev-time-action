import * as core from '@actions/core';
import { OpenRouterClient } from './openrouter';
import { GitHubClient } from './github';
import { formatEstimationComment } from './formatter';
import { filterDiffByPatterns, parseIgnorePatterns } from './diff-filter';
import { ActionInputs, SkillLevel } from './types';

async function run(): Promise<void> {
  try {
    core.info('Starting PR development time estimation...');

    const inputs: ActionInputs = {
      openrouterApiKey: core.getInput('openrouter-api-key', { required: true }),
      model: core.getInput('model') || 'meta-llama/llama-3.2-3b-instruct:free',
      skillLevels: core.getInput('skill-levels'),
      ignorePatterns: core.getInput('ignore-patterns'),
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

    // Parse and apply ignore patterns
    const ignorePatterns = parseIgnorePatterns(inputs.ignorePatterns || '');
    const { filteredDiff, filteredStats } = filterDiffByPatterns(
      prChanges.diffContent,
      ignorePatterns
    );

    // Use filtered stats if filtering was applied, otherwise use original
    const finalStats = ignorePatterns.length > 0 ? filteredStats : {
      additions: prChanges.additions,
      deletions: prChanges.deletions,
      changedFiles: prChanges.changedFiles
    };

    // Use filtered diff content
    const finalDiffContent = ignorePatterns.length > 0 ? filteredDiff : prChanges.diffContent;

    core.info(
      `Original PR: +${prChanges.additions} -${prChanges.deletions} across ${prChanges.changedFiles} files`
    );
    
    if (ignorePatterns.length > 0) {
      core.info(
        `Filtered PR (excluding ${ignorePatterns.length} patterns): +${finalStats.additions} -${finalStats.deletions} across ${finalStats.changedFiles} files`
      );
      core.info(`Ignored patterns: ${ignorePatterns.join(', ')}`);
    }

    const changes = `
**Files Changed:** ${finalStats.changedFiles}
**Lines Added:** +${finalStats.additions}
**Lines Deleted:** -${finalStats.deletions}

**Diff:**
${finalDiffContent}
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
export { filterDiffByPatterns, parseIgnorePatterns } from './diff-filter';
