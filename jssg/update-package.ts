import * as fs from 'fs';
import * as path from 'path';

export interface TransformResult {
  success: boolean;
  message: string;
}

function getTargetDirectory(fileInfo: { path: string; source: string } | string, options?: { target?: string }): string {
  if (options?.target) return options.target;
  if (typeof fileInfo === 'string') {
    return fs.statSync(fileInfo).isDirectory() ? fileInfo : path.dirname(fileInfo);
  }
  if (fileInfo?.path) {
    return fs.statSync(fileInfo.path).isDirectory() ? fileInfo.path : path.dirname(fileInfo.path);
  }
  return process.cwd();
}

export default function transform(
  fileInfo: { path: string; source: string } | string,
  api?: unknown,
  options?: { target?: string; [key: string]: unknown }
): TransformResult {
  const targetPath = getTargetDirectory(fileInfo, options);

  try {
    const packageJsonPath = path.join(targetPath, 'package.json');
    
    // Handle missing package.json gracefully (failSilently: true)
    if (!fs.existsSync(packageJsonPath)) {
      return { success: true, message: 'No package.json found in target directory. Skipping silently.' };
    }

    const fileContent = fs.readFileSync(packageJsonPath, 'utf8');
    
    // Parse and modify the object (NO regex)
    const pkg = JSON.parse(fileContent);
    let modified = false;

    // Iterate through all possible dependency blocks
    const dependencyFields = ['dependencies', 'devDependencies', 'peerDependencies'] as const;

    for (const field of dependencyFields) {
      if (pkg[field] && typeof pkg[field] === 'object' && !Array.isArray(pkg[field])) {
        const deps = pkg[field] as Record<string, string>;
        
        if ('react-router-dom' in deps) {
          const version = deps['react-router-dom'] || '^7.0.0';
          
          // Remove "react-router-dom"
          delete deps['react-router-dom'];
          
          // Add "react-router" with the SAME version, unless it already exists (edge case)
          if (!('react-router' in deps)) {
            deps['react-router'] = version;
          }
          
          modified = true;
        }
      }
    }

    if (modified) {
      // Write the updated package.json back, preserving 2-space formatting natively
      fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
      return { success: true, message: 'Migrated react-router-dom to react-router in package.json' };
    }

    return { success: true, message: 'No react-router-dom dependency found. No modifications needed.' };

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { success: false, message: `Failed to process package.json: ${errorMsg}` };
  }
}
