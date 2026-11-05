// CareLink Mobile - MovementDiary.test.jsx - 2026-11-05
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MovementDiary from './MovementDiary';

beforeEach(() => {
  localStorage.clear();
});

test('shows week 16 threshold message when week < 16', () => {
  render(<MovementDiary week={14} />);
  expect(screen.getByText(/Movement notes are available from week/i)).toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});

test('renders diary form and disclaimer when week >= 16', () => {
  render(<MovementDiary week={20} />);
  expect(screen.getByText(/These are your personal observations/i)).toBeInTheDocument();
  expect(screen.getByRole('textbox')).toBeInTheDocument();
  expect(screen.getByText(/Contact your maternity care team immediately/i)).toBeInTheDocument();
});

test('allows adding a movement note and saving to localStorage', () => {
  render(<MovementDiary week={20} />);
  const input = screen.getByRole('textbox');
  fireEvent.change(input, { target: { value: 'Felt slight flutter after lunch' } });

  const submit = screen.getByRole('button', { name: /save movement note/i });
  fireEvent.click(submit);

  expect(screen.getByText('Felt slight flutter after lunch')).toBeInTheDocument();
  const stored = JSON.parse(localStorage.getItem('carelink_movements'));
  expect(stored).toHaveLength(1);
  expect(stored[0].text).toBe('Felt slight flutter after lunch');
});
