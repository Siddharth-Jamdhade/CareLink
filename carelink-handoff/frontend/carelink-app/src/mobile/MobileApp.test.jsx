import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MobileApp from './MobileApp';
import API from '../api';
import { saveConsent } from '../consent';

jest.mock('../api', () => ({ __esModule: true, default: { get: jest.fn(), patch: jest.fn(), post: jest.fn() }, backendOrigin: () => 'https://synthetic.example', errorMessage: e => e.response?.data?.detail || 'Connection unavailable' }));
jest.mock('./BabyScene', () => function MockScene() { return <div>Test illustration</div>; });
const profile = { id: 'one', name: 'Synthetic patient', age: 25, gestational_week: 20, profile_version: 3, lmp: '2026-06-15', calculated_edd: '2027-03-22', effective_edd: '2027-03-22', weeks: 20, days: 0, trimester: 2, dating_source: 'Recorded LMP', emergency_contact: null, phone_number: null };
const account = { role: 'patient', patient_id: 'one', logout: jest.fn() };

beforeEach(() => {
  localStorage.clear(); jest.clearAllMocks(); window.scrollTo = jest.fn();
  API.get.mockImplementation(path => Promise.resolve({ data: path === '/patients/' ? [{ id: 'one', name: profile.name }] : path.endsWith('/profile') ? profile : { patient: profile, facts: [], missing_items: [], conflicts: [] } }));
});

test('does not request patient information until device consent is accepted', async () => {
  render(<MobileApp account={account} />);
  expect(screen.getByRole('heading', { name: 'Your care. Your choice.' })).toBeInTheDocument();
  expect(API.get).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Agree and continue' }));
  expect(await screen.findByRole('heading', { name: 'A little closer, every day.' })).toBeInTheDocument();
  expect(API.get).toHaveBeenCalledWith('/mobile/one/profile');
  expect(API.get).toHaveBeenCalledWith('/patients/one/journey');
});

test('a stale save explains the conflict and retains the entered contact for review', async () => {
  saveConsent(false);
  API.patch.mockRejectedValue({ response: { status: 409, data: { detail: 'This profile changed elsewhere. Reload and review before saving again.' } } });
  render(<MobileApp account={account} />);
  await screen.findByRole('heading', { name: 'A little closer, every day.' });
  fireEvent.click(screen.getByRole('button', { name: 'Profile', exact: true }));
  fireEvent.change(screen.getByLabelText('Emergency contact'), { target: { value: 'Synthetic new contact' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save to shared record' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('This profile changed elsewhere'));
  expect(screen.getByLabelText('Emergency contact')).toHaveValue('Synthetic new contact');
  expect(screen.getByRole('button', { name: 'Retry / reload record' })).toBeEnabled();
});
