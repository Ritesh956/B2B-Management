import { render } from '@testing-library/react';
import App from '../App';

describe('App routing', () => {
  it('renders login page for unauthenticated users', async () => {
    window.history.pushState({}, 'Login', '/login');

    const view = render(<App />);

    expect(await view.findByText('Welcome back')).toBeInTheDocument();
  });
});
