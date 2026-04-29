import { tsx } from '@ast-grep/napi';

// All 6 required React Router v7 future flags
const FUTURE_FLAGS = {
  v7_relativeSplatPath: true,
  v7_startTransition: true,
  v7_fetcherPersist: true,
  v7_normalizeFormMethod: true,
  v7_partialHydration: true,
  v7_skipActionErrorRevalidation: true,
};

const ALL_FLAG_NAMES = Object.keys(FUTURE_FLAGS);

// Pre-formatted JSX prop string for insertion when no future prop exists
const FLAG_STRING = `future={{ ${ALL_FLAG_NAMES.map(f => `${f}: true`).join(', ')} }}`;

const ROUTER_COMPONENTS = ['BrowserRouter', 'HashRouter', 'MemoryRouter', 'RouterProvider'];

export default function transform(fileInfo: { path: string; source: string }): string {
  const filePath = fileInfo.path;
  let source = fileInfo.source;

  // Skip non-JSX/TSX/JS/TS files — future flags only appear in component files
  if (!filePath.match(/\.(tsx?|jsx?)$/)) {
    return source;
  }

  try {
    const ast = tsx.parse(source);
    const root = ast.root();

    for (const component of ROUTER_COMPONENTS) {
      // -------------------------------------------------------------------
      // PATTERN A: <Component $$$PROPS>$$$CHILDREN</Component> (with children)
      // Only inject FLAG_STRING if the node does NOT already have a future prop
      // -------------------------------------------------------------------
      const childrenMatches = root.findAll(`<${component} $$$PROPS>$$$CHILDREN</${component}>`);
      for (const node of childrenMatches) {
        const exactText = node.text();
        if (!exactText.includes('future=')) {
          const newText = exactText.replace(
            new RegExp(`(<${component})(\\s)`),
            `$1 ${FLAG_STRING}$2`
          );
          source = source.replace(exactText, newText);
        }
      }

      // -------------------------------------------------------------------
      // PATTERN B: <Component $$$PROPS /> (self-closing)
      // Only inject FLAG_STRING if the node does NOT already have a future prop
      // -------------------------------------------------------------------
      const selfClosingMatches = root.findAll(`<${component} $$$PROPS />`);
      for (const node of selfClosingMatches) {
        const exactText = node.text();
        if (!exactText.includes('future=')) {
          const newText = exactText.replace(/(\s*\/>)$/, ` ${FLAG_STRING}$1`);
          source = source.replace(exactText, newText);
        }
      }

      // -------------------------------------------------------------------
      // PATTERN C: SMART MERGE — <Component future={{ $EXISTING }}>$$$CHILDREN</Component>
      // Only appends flags that are NOT already present — zero duplicates guaranteed
      // -------------------------------------------------------------------
      const mergeChildrenMatches = root.findAll(
        `<${component} future={{ $$$EXISTING_FLAGS }} $$$REST_PROPS>$$$CHILDREN</${component}>`
      );
      for (const node of mergeChildrenMatches) {
        const exactText = node.text();
        if (exactText.includes('future=')) {
          const newText = exactText.replace(
            /future=\{\{([^}]*)\}\}/,
            (_match: string, existingFlags: string) => {
              const existingFlagNames = existingFlags
                .split(',')
                .map(f => f.trim().split(':')[0].trim())
                .filter(f => f.length > 0);

              const missingFlags = ALL_FLAG_NAMES.filter(f => !existingFlagNames.includes(f));

              if (missingFlags.length === 0) {
                return `future={{ ${existingFlags.trim()} }}`;
              }

              const missingFlagsStr = missingFlags.map(f => `${f}: true`).join(', ');
              return `future={{ ${existingFlags.trim()}, ${missingFlagsStr} }}`;
            }
          );
          source = source.replace(exactText, newText);
        }
      }

      // -------------------------------------------------------------------
      // PATTERN D: SMART MERGE — self-closing variant
      // -------------------------------------------------------------------
      const mergeSelfClosingMatches = root.findAll(
        `<${component} future={{ $$$EXISTING_FLAGS }} $$$REST_PROPS />`
      );
      for (const node of mergeSelfClosingMatches) {
        const exactText = node.text();
        if (exactText.includes('future=')) {
          const newText = exactText.replace(
            /future=\{\{([^}]*)\}\}/,
            (_match: string, existingFlags: string) => {
              const existingFlagNames = existingFlags
                .split(',')
                .map(f => f.trim().split(':')[0].trim())
                .filter(f => f.length > 0);

              const missingFlags = ALL_FLAG_NAMES.filter(f => !existingFlagNames.includes(f));

              if (missingFlags.length === 0) {
                return `future={{ ${existingFlags.trim()} }}`;
              }

              const missingFlagsStr = missingFlags.map(f => `${f}: true`).join(', ');
              return `future={{ ${existingFlags.trim()}, ${missingFlagsStr} }}`;
            }
          );
          source = source.replace(exactText, newText);
        }
      }
    }

    return source;
  } catch {
    // On any parse error, fail silently and return source unchanged (zero false positives)
    return source;
  }
}

export { FUTURE_FLAGS, FLAG_STRING };
