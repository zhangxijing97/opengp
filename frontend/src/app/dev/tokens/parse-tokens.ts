// Reads src/styles/tokens.css as text, so the /dev/tokens page can never drift from the file.
// The parser is line based on purpose (see the last line of the tokens.css header):
//   --name: value; /* note */
//   .text-name { prop: value; prop: value; } /* note */

export interface CssVariable {
  /** Custom property name, for example "--color-brand-indigo". */
  name: string;
  value: string;
  /** Trailing comment of the declaration, or an empty string. */
  note: string;
}

export interface TextStyle {
  /** Class name without the dot, for example "text-row-title". */
  className: string;
  /** Font family variable, for example "--font-sans". Empty if the rule has no var() family. */
  family: string;
  weight: string;
  size: string;
  lineHeight: string;
  letterSpacing: string;
  note: string;
}

export interface ParsedTokens {
  variables: CssVariable[];
  textStyles: TextStyle[];
}

const VARIABLE_LINE =
  /^\s*(--[a-z0-9_-]+)\s*:\s*(.+?)\s*;\s*(?:\/\*\s*(.*?)\s*\*\/)?\s*$/;
const TEXT_STYLE_LINE =
  /^\s*\.(text-[a-z0-9-]+)\s*\{([^}]*)\}\s*(?:\/\*\s*(.*?)\s*\*\/)?\s*$/;
const FAMILY_VARIABLE = /var\(\s*(--[a-z0-9_-]+)\s*\)/;

function parseDeclarations(body: string): Map<string, string> {
  const declarations = new Map<string, string>();
  for (const part of body.split(';')) {
    const colon = part.indexOf(':');
    if (colon === -1) continue;
    declarations.set(part.slice(0, colon).trim(), part.slice(colon + 1).trim());
  }
  return declarations;
}

export function parseTokens(css: string): ParsedTokens {
  const variables: CssVariable[] = [];
  const textStyles: TextStyle[] = [];

  for (const line of css.split('\n')) {
    const textStyle = TEXT_STYLE_LINE.exec(line);
    if (textStyle) {
      const declarations = parseDeclarations(textStyle[2]);
      const family = FAMILY_VARIABLE.exec(declarations.get('font-family') ?? '');
      textStyles.push({
        className: textStyle[1],
        family: family ? family[1] : '',
        weight: declarations.get('font-weight') ?? '',
        size: declarations.get('font-size') ?? '',
        lineHeight: declarations.get('line-height') ?? '',
        letterSpacing: declarations.get('letter-spacing') ?? '',
        note: textStyle[3] ?? '',
      });
      continue;
    }

    const variable = VARIABLE_LINE.exec(line);
    if (variable) {
      variables.push({
        name: variable[1],
        value: variable[2],
        note: variable[3] ?? '',
      });
    }
  }

  return { variables, textStyles };
}
