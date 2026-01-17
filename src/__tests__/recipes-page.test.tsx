import { render, screen } from '@testing-library/react';
import RecipesPage from '../app/recipes/page';
import { describe, it, expect } from 'vitest';
import { mockRecipes } from '../mock/data';

describe('RecipesPage', () => {
  it('renders the page title', () => {
    render(<RecipesPage />);
    expect(screen.getByText('おすすめのレシピ')).toBeDefined();
  });

  it('renders all mock recipes', () => {
    render(<RecipesPage />);
    mockRecipes.forEach(recipe => {
      expect(screen.getAllByText(recipe.title).length).toBeGreaterThan(0);
    });
  });

  it('contains links to recipe details', () => {
    render(<RecipesPage />);
    const links = screen.getAllByRole('link', { name: /詳細を見る/i });
    expect(links.length).toBe(mockRecipes.length);
    expect(links[0].getAttribute('href')).toBe(`/recipes/${mockRecipes[0].id}`);
  });
});
