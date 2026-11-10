// The homepage's prose is written once, in src/site.ts, as markdown with two
// inline forms only: [text](https://...) and `code`. /index.md serves it as
// written; the HTML page renders it with this, so each claim on the page
// carries the same link to its evidence in both. Anything else is text.

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const code = (text: string) =>
  escape(text).replace(/`([^`]+)`/g, (_, inner: string) => `<code>${inner}</code>`);

/** One paragraph of the homepage's inline markdown as HTML. A link must be absolute https. */
export const inlineHtml = (markdown: string) => {
  let html = "";
  let rest = markdown;
  const link = /\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/;
  for (let match = link.exec(rest); match; match = link.exec(rest)) {
    html += code(rest.slice(0, match.index));
    html += `<a href="${escape(match[2])}">${code(match[1])}</a>`;
    rest = rest.slice(match.index + match[0].length);
  }
  return html + code(rest);
};
