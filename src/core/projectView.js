import { buildSections, effectiveStack } from './contextBuilder.js';

export { effectiveStack };

// Read-side helpers: combine derived analysis with the user's own edits.

export const isConfirmed = (f) => !!f.confirmed || f.evidence === 'attachment' || f.evidence === 'manual';

export const effectiveLastWorkingPoint = (project) =>
  project.overrides?.lastWorkingPoint || project.analysis?.lastWorkingPoint || project.lastWorkingPoint || '';

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Sections as shown and exported: derived, with the user's manual notes taking precedence. */
export function getSections(project) {
  let sections;
  if (project.isSample) {
    sections = (project.context || []).map((c) => ({
      id: slug(c.title),
      title: c.title,
      source: 'sample',
      ...(Array.isArray(c.body) ? { groups: [{ items: c.body }] } : { text: c.body }),
    }));
  } else {
    sections = buildSections(project);
  }
  const notes = project.overrides?.contextNotes || {};
  return sections.map((s) => (notes[s.id] ? { id: s.id, title: s.title, text: notes[s.id], source: 'manual', empty: false } : s));
}

/** Plain-text form of a section, used to pre-fill the editor. */
export function sectionToText(section) {
  if (section.empty) return '';
  if (section.text) return section.text;
  return (section.groups || [])
    .map((g) => `${g.label ? `${g.label}:\n` : ''}${g.items.map((i) => `- ${i}`).join('\n')}`)
    .join('\n\n');
}
