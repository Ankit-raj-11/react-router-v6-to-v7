module.exports = {
  collectFileStats: function(filePath, originalContent, newContent) {
    const originalLines = originalContent.split('\n').length;
    const newLines = newContent.split('\n').length;
    // Note: Simple line count diff. For git-style patches, use --git-diff flag
    return {
      file: filePath,
      added: newLines > originalLines ? newLines - originalLines : 0,
      removed: originalLines > newLines ? originalLines - newLines : 0,
      originalLines,
      newLines,
      status: 'modified'
    };
  },
  collectFinalStats: function(allFileStats, totalScanned) {
    let totalAdditions = 0;
    let totalRemovals = 0;
    for (const stat of allFileStats) {
      totalAdditions += stat.added;
      totalRemovals += stat.removed;
    }
    return {
      totalScanned,
      totalModified: allFileStats.length,
      totalAdditions,
      totalRemovals,
      falsePositives: 0
    };
  }
};
