import { useEffect, useState, type FormEvent } from 'react';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8100';

interface Item {
  id: string;
  name: string;
}

function SignIn() {
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
    return <p role="status">Welcome, {signedIn}</p>;
  }

  return (
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
  );
}

function Items() {
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/items`);
      setItems((await response.json()) as Item[]);
    } catch {
      setItems([]);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const addItem = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed === '') {
      return;
    }
    setBusy(true);
    try {
      await fetch(`${apiBaseUrl}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      setName('');
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h2>Items</h2>
      <form onSubmit={(event) => void addItem(event)}>
        <label>
          New item
          <input value={name} disabled={busy} onChange={(event) => setName(event.target.value)} />
        </label>
        <button type="submit" disabled={busy}>
          Add
        </button>
      </form>
      <ul aria-label="Items">
        {items.map((item) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </section>
  );
}

/** Sign-in flow plus an items list backed by the sample API. */
export function App() {
  return (
    <main>
      <h1>Sample App</h1>
      <SignIn />
      <Items />
    </main>
  );
}
