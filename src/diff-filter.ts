export interface FileTypeAnalysis {
  configFiles: string[];
  codeFiles: string[];
  testFiles: string[];
  documentationFiles: string[];
  buildFiles: string[];
  otherFiles: string[];
}

export function filterDiffByPatterns(
  diffContent: string,
  ignorePatterns: string[]
): {
  filteredDiff: string;
  filteredStats: { additions: number; deletions: number; changedFiles: number };
  fileTypeAnalysis: FileTypeAnalysis;
} {
  if (!diffContent) {
    return {
      filteredDiff: diffContent,
      filteredStats: { additions: 0, deletions: 0, changedFiles: 0 },
      fileTypeAnalysis: {
        configFiles: [],
        codeFiles: [],
        testFiles: [],
        documentationFiles: [],
        buildFiles: [],
        otherFiles: [],
      },
    };
  }

  // Split diff into individual file sections
  const fileSections = diffContent
    .split(/(?=^diff --git )/m)
    .filter((section) => section.trim());
  const filteredSections: string[] = [];
  let filteredAdditions = 0;
  let filteredDeletions = 0;
  let filteredFiles = 0;

  const fileTypeAnalysis: FileTypeAnalysis = {
    configFiles: [],
    codeFiles: [],
    testFiles: [],
    documentationFiles: [],
    buildFiles: [],
    otherFiles: [],
  };

  for (const section of fileSections) {
    const lines = section.split('\n');
    const diffHeader = lines[0];

    // Extract filename from diff --git a/file b/file
    const fileMatch = diffHeader.match(/^diff --git a\/(.+?) b\/(.+?)(?:\s|$)/);

    if (!fileMatch) continue;

    const filename = fileMatch[2]; // Use the 'b/' filename (after changes)

    // Categorize file type (always do this for analysis)
    categorizeFile(filename, fileTypeAnalysis);

    // Check if file should be ignored
    if (
      ignorePatterns.length > 0 &&
      shouldIgnoreFile(filename, ignorePatterns)
    ) {
      continue; // Skip this file
    }

    // Count lines for this file
    const { additions, deletions } = countDiffLines(section);
    filteredAdditions += additions;
    filteredDeletions += deletions;
    filteredFiles++;

    filteredSections.push(section);
  }

  return {
    filteredDiff: filteredSections.join(''),
    filteredStats: {
      additions: filteredAdditions,
      deletions: filteredDeletions,
      changedFiles: filteredFiles,
    },
    fileTypeAnalysis,
  };
}

function shouldIgnoreFile(filename: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    // Convert glob pattern to regex
    // First escape special regex characters except * and ?
    const regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special regex chars except * and ?
      .replace(/\*\*/g, ':::DOUBLESTAR:::') // Temporarily replace ** to avoid interference
      .replace(/\*/g, '[^/]*') // * matches anything except path separator
      .replace(/:::DOUBLESTAR:::/g, '.*') // ** matches any path including separators
      .replace(/\?/g, '.'); // ? matches single character

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filename);
  });
}

function countDiffLines(diffSection: string): {
  additions: number;
  deletions: number;
} {
  const lines = diffSection.split('\n');
  let additions = 0;
  let deletions = 0;

  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      additions++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      deletions++;
    }
  }

  return { additions, deletions };
}

function categorizeFile(filename: string, analysis: FileTypeAnalysis): void {
  const lowerFilename = filename.toLowerCase();
  const extension = filename.split('.').pop()?.toLowerCase() || '';

  // Test files
  if (
    lowerFilename.includes('.test.') ||
    lowerFilename.includes('.spec.') ||
    lowerFilename.includes('/__tests__/') ||
    lowerFilename.includes('/test/') ||
    lowerFilename.includes('/tests/')
  ) {
    analysis.testFiles.push(filename);
    return;
  }

  // Configuration files
  if (
    ['json', 'yml', 'yaml', 'toml', 'ini', 'conf', 'config'].includes(
      extension
    ) ||
    [
      'dockerfile',
      'gitignore',
      'gitattributes',
      'editorconfig',
      'prettierrc',
      'eslintrc',
    ].some((config) => lowerFilename.includes(config)) ||
    [
      'package.json',
      'tsconfig.json',
      'jest.config.js',
      'webpack.config.js',
      'vite.config.js',
      'tailwind.config.js',
      'next.config.js',
      'babel.config.js',
      '.env',
    ].some((config) => lowerFilename.endsWith(config))
  ) {
    analysis.configFiles.push(filename);
    return;
  }

  // Build/CI files
  if (
    lowerFilename.includes('.github/workflows/') ||
    lowerFilename.includes('/.github/') ||
    lowerFilename.includes('ci/') ||
    lowerFilename.includes('scripts/') ||
    ['makefile', 'dockerfile', 'docker-compose.yml'].some((build) =>
      lowerFilename.includes(build)
    )
  ) {
    analysis.buildFiles.push(filename);
    return;
  }

  // Documentation files
  if (
    ['md', 'rst', 'txt', 'doc', 'docx', 'pdf'].includes(extension) ||
    ['readme', 'changelog', 'license', 'contributing', 'docs/'].some((doc) =>
      lowerFilename.includes(doc)
    )
  ) {
    analysis.documentationFiles.push(filename);
    return;
  }

  // Code files
  if (
    [
      'js',
      'ts',
      'jsx',
      'tsx',
      'py',
      'java',
      'c',
      'cpp',
      'h',
      'hpp',
      'cs',
      'php',
      'rb',
      'go',
      'rs',
      'kt',
      'swift',
      'dart',
      'vue',
      'svelte',
      'html',
      'css',
      'scss',
      'sass',
      'less',
      'sql',
      'sh',
      'bash',
      'ps1',
      'r',
      'scala',
      'clj',
      'ex',
      'exs',
    ].includes(extension)
  ) {
    analysis.codeFiles.push(filename);
    return;
  }

  // Everything else
  analysis.otherFiles.push(filename);
}

export function parseIgnorePatterns(input: string): string[] {
  if (!input || input.trim() === '') return [];

  return input
    .split(',')
    .map((pattern) => pattern.trim())
    .filter((pattern) => pattern.length > 0);
}
