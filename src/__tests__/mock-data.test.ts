import { describe, it, expect } from 'vitest';
import { mockRecipes } from '../mock/data';

describe('Mock Data', () => {
  it('should have a list of mock recipes', () => {
    expect(mockRecipes.length).toBeGreaterThan(0);
  });

  it('each recipe should have required fields', () => {
    mockRecipes.forEach(recipe => {
      expect(recipe.id).toBeDefined();
      expect(recipe.title).toBeDefined();
      expect(recipe.genre).toBeDefined();
      expect(recipe.nutrition).toBeDefined();
      expect(recipe.ingredients.length).toBeGreaterThan(0);
      expect(recipe.steps.length).toBeGreaterThan(0);
    });
  });

  it('should have varied taste levels', () => {
    const levels = mockRecipes.map(r => r.tasteLevel);
    const min = Math.min(...levels);
    const max = Math.max(...levels);
    expect(max - min).toBeGreaterThan(50); // さっぱりからこってりまであるか
  });
});
