import { useState, type FormEvent } from 'react';

/** Minimal sign-in flow exercising the platform's locator conventions. */
export function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [signedIn, setSignedIn] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (username !== '' && password !== '') {
      setSignedIn(username);
    }
  };

  if (signedIn !== null) {
    return (
      <main>
        <h1>Sample App</h1>
        <p role="status">Welcome, {signedIn}</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Sample App</h1>
      <form onSubmit={submit} aria-label="Sign in">
        <h2>Sign in</h2>
        <label>
          Username
          <input value={username} onChange={(event) => setUsername(event.target.value)} />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <button type="submit" data-testid="login-submit">
          Sign in
        </button>
      </form>
    </main>
  );
}
