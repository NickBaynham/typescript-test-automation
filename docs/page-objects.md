# Writing Page Objects

Page objects live in `src/pages/` and extend `BasePage` (`src/pages/base-page.ts`).

## The pattern

A page object declares its route path and exposes intent-level locators and actions. Tests never touch raw selectors.

```typescript
import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base-page.js';

export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page, '/login');
  }

  get heading(): Locator {
    return this.byRole('heading', { name: 'Sign in' });
  }

  get submitButton(): Locator {
    return this.byTestId('login-submit');
  }

  async signIn(user: string, password: string): Promise<void> {
    await this.byLabel('Username').fill(user);
    await this.byLabel('Password').fill(password);
    await this.submitButton.click();
  }
}
```

## Locator conventions (React)

In priority order:

1. `byRole(role, { name })` - ARIA role plus accessible name. Resilient to markup changes and doubles as an accessibility check. Use for anything a user perceives: buttons, links, headings.
2. `byLabel(text)` - label text, for form fields. Note that password inputs have no implicit ARIA role, so `byRole('textbox')` cannot reach them; `byLabel` is the convention for all labeled inputs.
3. `byTestId(id)` - `data-testid` attribute. The fallback when neither a role nor a label fits (containers, custom widgets). Agree test ids with the application code.

CSS and XPath selectors are not part of the pattern. If no convention can reach an element, treat it as an accessibility or testability gap in the application and add a role, label, or test id there.

`src/pages/sign-in-page.ts` is the living reference: it drives the sample application and is exercised by both unit tests and the e2e suite.

## Rules

- Route paths are absolute and start with `/`; `goto(baseUrl)` composes them against the configured base URL.
- Expose intent (`signIn(...)`), not mechanics (`fillUsernameField(...)`), for any multi-step interaction.
- Locator getters return `Locator` without awaiting; assertions and actions happen in tests or action methods.
- Page objects hold no mutable state and make no assertions.
- Every page object ships with unit tests (see `tests/unit/base-page.test.ts` for the stub-page approach).

## Pointing tests at a target

The base URL comes from environment configuration (`loadConfig().ui.baseUrl`), not from page objects. For the dockerized sample app no variables are needed; for a remote hosted target set `TARGET_MODE=remote` and `UI_BASE_URL=https://your-target.example.com`. See the Configuration section of the README.
