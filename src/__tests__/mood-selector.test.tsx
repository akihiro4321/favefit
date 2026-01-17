import { render, screen, fireEvent } from '@testing-library/react';
import { MoodSelector } from '../components/mood-selector';
import { describe, it, expect, vi } from 'vitest';

describe('MoodSelector', () => {
  const mockOnSubmit = vi.fn();

  it('renders all cuisine genres', () => {
    render(<MoodSelector onSubmit={mockOnSubmit} />);
    
    expect(screen.getByText('和食')).toBeDefined();
    expect(screen.getByText('洋食')).toBeDefined();
    expect(screen.getByText('中華')).toBeDefined();
    expect(screen.getByText('イタリアン')).toBeDefined();
    expect(screen.getByText('エスニック')).toBeDefined();
  });

  it('calls onSubmit with selected mood', () => {
    render(<MoodSelector onSubmit={mockOnSubmit} />);
    
    // ジャンルを選択 (和食はデフォルトで選択されているか、クリックして選択)
    const washokuCard = screen.getByText('和食').closest('div');
    if (washokuCard) fireEvent.click(washokuCard);
    
    // スライダーの値（デフォルト50とする）
    
    // 「レシピを見る」ボタンをクリック
    const submitButton = screen.getByRole('button', { name: /レシピを見る/i });
    fireEvent.click(submitButton);
    
    expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
      genre: '和食',
      tasteBalance: expect.any(Number)
    }));
  });
});
