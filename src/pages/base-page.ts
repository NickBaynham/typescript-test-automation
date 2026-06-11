import type { Locator, Page } from '@playwright/test';
import { joinUrl } from '../urls.js';

type Role = Parameters<Page['getByRole']>[0];
type RoleOptions = Parameters<Page['getByRole']>[1];

/**
 * Base class for page objects. Subclasses declare their route path and expose
 * intent-level locators built with the React-suited conventions: ARIA role and
 * accessible name first, data-testid as the fallback. CSS and XPath selectors
 * are not part of the pattern.
 */
export abstract class BasePage {
  protected constructor(
    protected readonly page: Page,
    /** Absolute route path of this page, starting with '/'. */
    readonly path: string,
  ) {}

  /** Navigates to this page under the given base URL (path prefixes preserved). */
  async goto(baseUrl: string): Promise<void> {
    await this.page.goto(joinUrl(baseUrl, this.path));
  }

  /** Locates by ARIA role and accessible name: the primary convention. */
  protected byRole(role: Role, options?: RoleOptions): Locator {
    return this.page.getByRole(role, options);
  }

  /** Locates form fields by label text, e.g. password inputs, which have no implicit role. */
  protected byLabel(label: string): Locator {
    return this.page.getByLabel(label);
  }

  /** Locates by data-testid: the fallback when no accessible role or label fits. */
  protected byTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }
}
