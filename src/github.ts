import * as core from '@actions/core';
import * as github from '@actions/github';
import { PrChanges } from './types';

export class GitHubClient {
  private octokit: ReturnType<typeof github.getOctokit>;
  private context: typeof github.context;

  constructor(token: string) {
    this.octokit = github.getOctokit(token);
    this.context = github.context;
  }

  async getPrChanges(): Promise<PrChanges> {
    const { owner, repo } = this.context.repo;
    const prNumber = this.context.payload.pull_request?.number;

    if (!prNumber) {
      throw new Error('This action must be run on a pull request');
    }

    core.info(`Fetching PR #${prNumber} changes...`);

    const [prDetails, diffResponse] = await Promise.all([
      this.octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
      }),
      this.octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
        mediaType: {
          format: 'diff',
        },
      }),
    ]);

    const pr = prDetails.data;
    const diffContent = diffResponse.data as unknown as string;

    return {
      additions: pr.additions,
      deletions: pr.deletions,
      changedFiles: pr.changed_files,
      diffContent: diffContent.slice(0, 10000), // Limit diff size for API
    };
  }

  async updateOrCreateComment(content: string): Promise<void> {
    const { owner, repo } = this.context.repo;
    const prNumber = this.context.payload.pull_request?.number;

    if (!prNumber) {
      throw new Error('This action must be run on a pull request');
    }

    const commentIdentifier = '<!-- dev-time-estimate-comment -->';
    const fullContent = `${commentIdentifier}\n${content}`;

    try {
      const existingComments = await this.octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: prNumber,
      });

      const existingComment = existingComments.data.find((comment) =>
        comment.body?.includes(commentIdentifier)
      );

      if (existingComment) {
        core.info(`Updating existing comment #${existingComment.id}`);
        await this.octokit.rest.issues.updateComment({
          owner,
          repo,
          comment_id: existingComment.id,
          body: fullContent,
        });
      } else {
        core.info('Creating new comment');
        await this.octokit.rest.issues.createComment({
          owner,
          repo,
          issue_number: prNumber,
          body: fullContent,
        });
      }
    } catch (error) {
      core.error(`Failed to update/create comment: ${error}`);
      throw error;
    }
  }
}
