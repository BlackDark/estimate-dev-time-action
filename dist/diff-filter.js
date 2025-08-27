"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterDiffByPatterns = filterDiffByPatterns;
exports.parseIgnorePatterns = parseIgnorePatterns;
function filterDiffByPatterns(diffContent, ignorePatterns) {
    if (!diffContent || ignorePatterns.length === 0) {
        return {
            filteredDiff: diffContent,
            filteredStats: { additions: 0, deletions: 0, changedFiles: 0 }
        };
    }
    // Split diff into individual file sections
    const fileSections = diffContent.split(/(?=^diff --git )/m).filter(section => section.trim());
    const filteredSections = [];
    let filteredAdditions = 0;
    let filteredDeletions = 0;
    let filteredFiles = 0;
    for (const section of fileSections) {
        const lines = section.split('\n');
        const diffHeader = lines[0];
        // Extract filename from diff --git a/file b/file
        const fileMatch = diffHeader.match(/^diff --git a\/(.+?) b\/(.+?)(?:\s|$)/);
        if (!fileMatch)
            continue;
        const filename = fileMatch[2]; // Use the 'b/' filename (after changes)
        // Check if file should be ignored
        if (shouldIgnoreFile(filename, ignorePatterns)) {
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
            changedFiles: filteredFiles
        }
    };
}
function shouldIgnoreFile(filename, patterns) {
    return patterns.some(pattern => {
        // Convert glob pattern to regex
        // First escape special regex characters except * and ?
        let regexPattern = pattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special regex chars except * and ?
            .replace(/\*\*/g, ':::DOUBLESTAR:::') // Temporarily replace ** to avoid interference
            .replace(/\*/g, '[^/]*') // * matches anything except path separator  
            .replace(/:::DOUBLESTAR:::/g, '.*') // ** matches any path including separators
            .replace(/\?/g, '.'); // ? matches single character
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(filename);
    });
}
function countDiffLines(diffSection) {
    const lines = diffSection.split('\n');
    let additions = 0;
    let deletions = 0;
    for (const line of lines) {
        if (line.startsWith('+') && !line.startsWith('+++')) {
            additions++;
        }
        else if (line.startsWith('-') && !line.startsWith('---')) {
            deletions++;
        }
    }
    return { additions, deletions };
}
function parseIgnorePatterns(input) {
    if (!input || input.trim() === '')
        return [];
    return input
        .split(',')
        .map(pattern => pattern.trim())
        .filter(pattern => pattern.length > 0);
}
//# sourceMappingURL=diff-filter.js.map