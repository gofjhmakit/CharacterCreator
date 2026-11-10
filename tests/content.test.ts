import { describe, it, expect } from 'vitest';
import { ContentDB } from '@/content/registry';
import { bundledContent } from '@/content';
import { validateContentDB } from '@/content/validate';

describe('bundled content', () => {
  const db = new ContentDB(bundledContent());
  const issues = validateContentDB(db);
  it('has no content errors', () => {
    const errors = issues.filter((i) => i.level === 'error');
    expect(errors, JSON.stringify(errors.slice(0, 20), null, 1)).toEqual([]);
  });
  it('has no unresolved references', () => {
    const warnings = issues.filter((i) => i.level === 'warning');
    expect(warnings, JSON.stringify(warnings.slice(0, 40), null, 1)).toEqual([]);
  });
  it('covers 12 classes and broad subclass/race lists', () => {
    expect(db.classes.size).toBe(12);
    expect(db.subclasses.size).toBeGreaterThanOrEqual(90);
    expect(db.races.size).toBeGreaterThanOrEqual(27);
    expect(db.backgrounds.size).toBeGreaterThanOrEqual(13);
    expect(db.spells.size).toBeGreaterThanOrEqual(319);
    expect(db.items.size).toBeGreaterThan(500);
  });
  it('every class has at least one subclass', () => {
    for (const c of db.classes.values()) expect(db.subclassesFor(c.id).length, c.id).toBeGreaterThan(0);
  });
});
