const { execSync } = require('child_process');

module.exports = {
  validateTypeScript: function(projectPath) {
    try {
      execSync('npx tsc --noEmit', { cwd: projectPath, stdio: 'pipe' });
      return { status: 'passing', message: '✅ TypeScript compiles', errorCount: 0 };
    } catch (error) {
      if (error.message.includes('tsc not found') || error.message.includes('command not found')) {
        return { status: 'skipped', message: '⚠️ TypeScript not configured', errorCount: 0 };
      }
      return { status: 'failing', message: '❌ TypeScript errors found', errorCount: 1 };
    }
  }
};
