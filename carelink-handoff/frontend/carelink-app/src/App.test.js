import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Dashboard from './pages/Dashboard';
import API, { readCache, writeCache, removeCache } from './api';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));
jest.mock('./api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() }, readCache: jest.fn(), writeCache: jest.fn(), removeCache: jest.fn(), errorMessage: () => 'Cannot reach backend' }));

beforeEach(() => jest.clearAllMocks());

test('loads patients and opens the selected journey', async () => {
  API.get.mockResolvedValue({ data: [{ id: 'test-1', name: 'Synthetic Patient', age: 25, gestational_week: 28 }] });
  render(<Dashboard />);
  fireEvent.click(await screen.findByText('Synthetic Patient'));
  expect(API.get).toHaveBeenCalledWith('/patients/');
  expect(mockNavigate).toHaveBeenCalledWith('/patient/test-1');
});

test('creates a patient and refreshes the list', async () => {
  API.get.mockResolvedValue({ data: [] });
  API.post.mockResolvedValue({ data: {} });
  render(<Dashboard />);
  await waitFor(() => expect(API.get).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByText('+ New'));
  fireEvent.change(screen.getByPlaceholderText('Patient full name'), { target: { value: 'Synthetic Patient' } });
  fireEvent.change(screen.getByPlaceholderText('Age'), { target: { value: '25' } });
  fireEvent.change(screen.getByPlaceholderText('Gest. Week'), { target: { value: '28' } });
  fireEvent.click(screen.getByRole('button', { name: /Create Patient/ }));
  await waitFor(() => expect(API.post).toHaveBeenCalledWith('/patients/', { name: 'Synthetic Patient', age: 25, gestational_week: 28 }));
  await waitFor(() => expect(API.get).toHaveBeenCalledTimes(2));
});


test('loads saved patients on network failure', async () => {
  API.get.mockRejectedValue(new Error('offline'));
  readCache.mockReturnValue([{ id: 'saved', name: 'Saved Patient', age: 30, gestational_week: 20 }]);
  render(<Dashboard />);
  expect(await screen.findByText('Saved Patient')).toBeInTheDocument();
  expect(screen.getByText(/Cannot reach server/)).toBeInTheDocument();
});

test('confirmed deletion clears the cached patient and journey', async () => {
  API.get.mockResolvedValue({ data: [{ id: 'delete-me', name: 'Remove Patient', age: 25, gestational_week: 28 }] });
  API.delete.mockResolvedValue({});
  jest.spyOn(window, 'confirm').mockReturnValue(true);
  render(<Dashboard />);
  await screen.findByText('Remove Patient');
  fireEvent.click(screen.getByTitle('Delete patient'));
  await waitFor(() => expect(API.delete).toHaveBeenCalledWith('/patients/delete-me'));
  await waitFor(() => expect(screen.queryByText('Remove Patient')).not.toBeInTheDocument());
  expect(writeCache).toHaveBeenLastCalledWith('patients', []);
  expect(removeCache).toHaveBeenCalledWith('journey-delete-me');
  window.confirm.mockRestore();
});
