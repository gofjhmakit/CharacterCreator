// Ruleset context: every character-scoped view reads content from its character's ruleset database.
import { createContext, useContext } from 'react';
import type { RulesetId } from '@/types/core';
import { useApp } from '@/state/store';
import type { ContentDB } from '@/content/registry';

export const RulesetContext = createContext<RulesetId>('dnd5e-2014');
export const RulesetProvider = RulesetContext.Provider;

export function useRuleset(): RulesetId { return useContext(RulesetContext); }
export function useDb(): ContentDB { const r = useContext(RulesetContext); return useApp((s) => s.dbs[r]); }
export const dbFor = (r: RulesetId | undefined): ContentDB => useApp.getState().dbs[r ?? 'dnd5e-2014'];
