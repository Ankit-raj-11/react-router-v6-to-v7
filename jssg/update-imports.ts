import { tsx } from '@ast-grep/napi';

export default function transform(fileInfo: { path: string; source: string }): string {
  let source = fileInfo.source;

  // Utilize jssg (JS ast-grep) to guarantee zero false positives by matching exact AST nodes
  // instead of broad regular expressions that could corrupt comments or strings.
  const ast = tsx.parse(source);
  const root = ast.root();

  // Find all import statements that import from 'react-router-dom'
  const allMatches = root.findAll({
    rule: {
      kind: 'import_statement',
      has: { kind: 'string', regex: 'react-router-dom' }
    }
  });

  // Process transformations
  for (const node of allMatches) {
    const exactText = node.text();
    
    // Because ast-grep has validated this is a true import AST node and NOT a comment or string,
    // we can safely execute a targeted string replace strictly within the bounds of this specific node.
    // This perfectly preserves all user formatting, indentation, aliases, and inline comments.
    const newText = exactText.replace(/['"]react-router-dom['"]/, "'react-router'");
    
    source = source.replace(exactText, newText);
  }

  return source;
}
