import { render, screen } from '@testing-library/react';
import RecipeDetailPage from '../app/recipes/[id]/page';
import { describe, it, expect, vi } from 'vitest';
import { mockRecipes } from '../mock/data';

// Mock the useSearchParams or other hooks if necessary, 
// but for a server component (or one that receives params), we can just pass them.

describe('RecipeDetailPage', () => {
  it('renders recipe details for a valid ID', async () => {
    const recipe = mockRecipes[0];
    const params = Promise.resolve({ id: recipe.id });
    
    // In Next.js 15+, page components receive params as a Promise
    const { container } = render(await RecipeDetailPage({ params }));
    
    expect(screen.getByText(recipe.title)).toBeDefined();
    expect(screen.getByText(recipe.description)).toBeDefined();
    
    // Check ingredients
    recipe.ingredients.forEach(ing => {
      expect(screen.getByText(ing.name)).toBeDefined();
    });
    
    // Check steps
    recipe.steps.forEach(step => {
      expect(screen.getByText(step)).toBeDefined();
    });
  });

  it('renders not found message for an invalid ID', async () => {
    const params = Promise.resolve({ id: '999' });
    render(await RecipeDetailPage({ params }));
    
    expect(screen.getByText(/レシピが見つかりませんでした/i)).toBeDefined();
  });
});
