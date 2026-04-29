const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function getHash(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

module.exports = {
  hasBackup: function(projectPath) {
    return fs.existsSync(path.join(projectPath, '.codemod-backup', 'manifest.json'));
  },

  getBackupInfo: function(projectPath) {
    const manifestPath = path.join(projectPath, '.codemod-backup', 'manifest.json');
    if (!fs.existsSync(manifestPath)) return null;
    try {
      return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (e) {
      return null;
    }
  },

  createBackup: function(projectPath, filesToBackup) {
    const backupDir = path.join(projectPath, '.codemod-backup');
    const filesDir = path.join(backupDir, 'files');
    
    console.log(`📦 Creating backup... (.codemod-backup/)`);
    
    if (fs.existsSync(backupDir)) {
      fs.rmSync(backupDir, { recursive: true, force: true });
    }
    
    fs.mkdirSync(filesDir, { recursive: true });

    let totalSize = 0;
    const manifestFiles = [];

    // Also backup package.json if it exists
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(packageJsonPath) && !filesToBackup.includes(packageJsonPath)) {
      filesToBackup = [...filesToBackup, packageJsonPath];
    }

    for (const file of filesToBackup) {
      if (!fs.existsSync(file)) continue;
      
      const content = fs.readFileSync(file);
      const stat = fs.statSync(file);
      totalSize += stat.size;
      
      // Relative path to maintain structure
      const relativePath = path.relative(projectPath, file);
      const backupPath = path.join(filesDir, relativePath);
      
      fs.mkdirSync(path.dirname(backupPath), { recursive: true });
      fs.copyFileSync(file, backupPath);
      
      manifestFiles.push({
        original: relativePath,
        backup: path.relative(projectPath, backupPath).replace(/\\/g, '/'),
        size: stat.size,
        hash: getHash(content)
      });
    }

    const manifest = {
      timestamp: new Date().toISOString().replace(/[:.]/g, '-'),
      projectRoot: projectPath,
      totalFiles: manifestFiles.length,
      files: manifestFiles
    };

    fs.writeFileSync(path.join(backupDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
    
    console.log(`✅ Backup complete. ${manifest.totalFiles} files saved. (${(totalSize / 1024).toFixed(1)} KB)`);
    return { success: true, count: manifest.totalFiles, location: backupDir };
  },

  restoreBackup: function(projectPath, keepBackup = false) {
    const backupDir = path.join(projectPath, '.codemod-backup');
    const manifestPath = path.join(backupDir, 'manifest.json');
    
    console.log(`\n🔄 Restoring from backup... (.codemod-backup/)`);
    
    if (!fs.existsSync(manifestPath)) {
      console.error(`❌ Error: No backup manifest found in ${backupDir}`);
      return { success: false, count: 0 };
    }

    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (e) {
      console.error(`❌ Error: Backup manifest is corrupted.`);
      return { success: false, count: 0 };
    }

    let restoreCount = 0;
    let errors = 0;

    for (const fileInfo of manifest.files) {
      const originalPath = path.join(projectPath, fileInfo.original);
      const backupFilePath = path.join(projectPath, fileInfo.backup);

      if (!fs.existsSync(backupFilePath)) {
        console.error(`  ❌ Missing backup file: ${fileInfo.backup}`);
        errors++;
        continue;
      }

      const backupContent = fs.readFileSync(backupFilePath);
      
      // Verify integrity
      if (backupContent.length !== fileInfo.size) {
        console.error(`  ❌ Integrity check failed for ${fileInfo.original} (size mismatch)`);
        errors++;
        continue;
      }
      
      if (getHash(backupContent) !== fileInfo.hash) {
        console.error(`  ❌ Integrity check failed for ${fileInfo.original} (hash mismatch)`);
        errors++;
        continue;
      }

      try {
        fs.writeFileSync(originalPath, backupContent);
        restoreCount++;
      } catch (e) {
        console.error(`  ❌ Failed to restore ${fileInfo.original}: ${e.message}`);
        errors++;
      }
    }

    if (errors > 0) {
      console.log(`⚠️ Rollback completed with ${errors} errors.`);
    } else {
      console.log(`✅ Restored ${restoreCount} files to original state.`);
      console.log(`✅ Rollback complete.`);
    }

    if (!keepBackup && errors === 0) {
      try {
        fs.rmSync(backupDir, { recursive: true, force: true });
        console.log(`🧹 Cleaned up backup folder.`);
      } catch (e) {
        console.log(`⚠️ Failed to clean up backup folder.`);
      }
    }

    return { success: errors === 0, count: restoreCount };
  }
};
