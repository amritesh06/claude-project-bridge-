import { PLACEHOLDER_PATTERN, SELECTORS } from './selectors.js';
import { queryAll } from './conversationExtractor.js';

const MAX_TEXT = 20000;

export function getProjectIdFromPath(loc = location) {
  const m = loc.pathname.match(/^\/projects?\/([\w-]+)/);
  return m ? m[1] : null;
}

const clean = (s) => {
  const t = (s || '').trim().slice(0, MAX_TEXT);
  return t && !PLACEHOLDER_PATTERN.test(t) ? t : '';
};

const firstText = (doc, selectors) => {
  for (const el of queryAll(doc, selectors)) {
    const t = clean(el.innerText || el.textContent);
    if (t) return t;
  }
  return '';
};

// Finds a labelled section ("Instructions") and returns the text that follows it.
function textAfterLabel(doc, labelPattern) {
  const candidates = doc.querySelectorAll('h1, h2, h3, h4, div, span, p');
  for (const el of candidates) {
    if (el.children.length > 1) continue;
    const label = (el.textContent || '').trim();
    if (!labelPattern.test(label)) continue;
    const next = el.nextElementSibling || el.parentElement?.nextElementSibling;
    const t = clean(next?.innerText || next?.textContent);
    if (t) return t;
  }
  return '';
}

/**
 * Reads project details from the page. Returns only what is visible in the DOM.
 * Fields that aren't visible are left empty (never guessed); the popup offers manual entry.
 */
export function extractProject(doc = document, loc = location, page = 'other') {
  const warnings = [];
  let projectId = null;
  let name = '';

  if (page === 'project') {
    projectId = getProjectIdFromPath(loc);
    name = firstText(doc, SELECTORS.projectName);
    if (!name) name = (doc.title || '').replace(/\s*[-–|]\s*Claude\s*$/i, '').trim();
  } else if (page === 'conversation') {
    // Header breadcrumb only; the sidebar lists every project and would be ambiguous.
    const links = [...doc.querySelectorAll(SELECTORS.projectBreadcrumb)].filter((a) => !a.closest('nav'));
    const hrefs = [...new Set(links.map((a) => a.getAttribute('href')))];
    if (hrefs.length === 1) {
      projectId = hrefs[0].split('/').filter(Boolean)[1] || null;
      name = (links[0].textContent || '').trim();
    } else if (hrefs.length > 1) {
      warnings.push('More than one project link found in the header. Assign the project manually.');
    }
  }

  const description = page === 'project' ? firstText(doc, SELECTORS.projectDescription) : '';
  const instructions = page === 'project' ? textAfterLabel(doc, /^(project )?instructions$/i) : '';

  if (page === 'project' && !instructions) {
    warnings.push('Project instructions are not visible on this page. Open the instructions panel and capture again, or add them manually.');
  }
  if (page === 'conversation' && !projectId) {
    warnings.push('This conversation is not linked to a project, or the link could not be read.');
  }

  return { projectId, name, description, instructions, warnings };
}
