import MarkdownIt from "markdown-it";
import DOMPurify from "dompurify";
const parser = new MarkdownIt({ html: false, linkify: false, breaks: true });
export function markdown(value: string) {
  return DOMPurify.sanitize(parser.render(value), {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["style", "iframe"],
    FORBID_ATTR: ["style"],
  });
}
export function safeHtml(value: string) {
  return DOMPurify.sanitize(value, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["style", "iframe"],
    FORBID_ATTR: ["style"],
  });
}
