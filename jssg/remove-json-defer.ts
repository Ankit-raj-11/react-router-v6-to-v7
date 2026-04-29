import { tsx } from '@ast-grep/napi';

export default function transform(fileInfo: { path: string; source: string }): string {
  const filePath = fileInfo.path;
  let source = fileInfo.source;

  // Skip non-JS/TS files
  if (!filePath.match(/\.(tsx?|jsx?)$/)) {
    return source;
  }

  // Early exit optimization: skip files with no json() or defer() usage
  if (!source.includes('json(') && !source.includes('defer(')) {
    return source;
  }

  try {
    const ast = tsx.parse(source);
    const root = ast.root();

    // -------------------------------------------------------------------
    // PATTERN A: return json({ ... }) → return { ... }
    // Matches call expressions at the AST node level — NOT regex string matches
    // -------------------------------------------------------------------
    const jsonMatches = root.findAll(`json($$$CONTENT)`);
    for (const node of jsonMatches) {
      const exactText = node.text();
      if (exactText.match(/^json\(/)) {
        // Strip the json() wrapper, preserving interior content exactly
        const newText = exactText.replace(/^json\(/, '').replace(/\)$/, '');
        source = source.replace(exactText, newText);
      }
    }

    // -------------------------------------------------------------------
    // PATTERN B: return defer({ ... }) → return { ... }
    // -------------------------------------------------------------------
    const deferMatches = root.findAll(`defer($$$CONTENT)`);
    for (const node of deferMatches) {
      const exactText = node.text();
      if (exactText.match(/^defer\(/)) {
        const newText = exactText.replace(/^defer\(/, '').replace(/\)$/, '');
        source = source.replace(exactText, newText);
      }
    }

    // -------------------------------------------------------------------
    // PATTERN C: Remove json/defer from import statement if no longer used
    // INTENTIONAL re-parse: we must query the import statement against the
    // already-transformed source (post json/defer removal), NOT the original AST.
    // If we used the original root here, we'd check stale call-site positions and
    // incorrectly remove imports that are still referenced. Do NOT collapse into
    // a single parse pass without re-validating this logic first.
    // -------------------------------------------------------------------
    const updatedAst = tsx.parse(source);
    const updatedRoot = updatedAst.root();

    // Match named imports from react-router-dom (pre-migration) or react-router
    const importPatterns = [
      `import { $$$IMPORTS } from 'react-router-dom'`,
      `import { $$$IMPORTS } from 'react-router'`,
    ];

    for (const pattern of importPatterns) {
      const importMatches = updatedRoot.findAll(pattern);
      for (const node of importMatches) {
        const exactText = node.text();
        const importMatch = exactText.match(/import\s*\{\s*([^}]+)\s*\}\s*from\s*['"][^'"]+['"]/);
        if (!importMatch) continue;

        const allImports = importMatch[1].split(',').map(i => i.trim()).filter(Boolean);

        const filteredImports = allImports.filter(i => {
          const name = i.split(' as ')[0].trim(); // handle aliased imports
          if (name === 'json' || name === 'defer') {
            // Only remove if no longer referenced in the transformed source
            return source.includes(`${name}(`);
          }
          return true;
        });

        if (filteredImports.length === allImports.length) continue; // nothing to remove

        if (filteredImports.length === 0) {
          // Remove the entire import line including trailing newline
          source = source.replace(exactText + '\n', '').replace(exactText, '');
        } else {
          const fromMatch = exactText.match(/from\s*(['"][^'"]+['"])/);
          const fromPath = fromMatch ? fromMatch[1] : "'react-router'";
          let newImport = `import { ${filteredImports.join(', ')} } from ${fromPath}`;
          if (exactText.trim().endsWith(';')) newImport += ';';
          source = source.replace(exactText, newImport);
        }
      }
    }

    return source;
  } catch {
    // On any parse error, fail silently and return source unchanged (zero false positives)
    return source;
  }
}
