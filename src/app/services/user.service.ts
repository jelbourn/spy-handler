import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Service, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { CreateUserRequest, LoginRequest, User } from '../../../shared/models';

const STORAGE_KEY = 'spy-handler.user';

@Service()
export class UserService {
  private readonly http = inject(HttpClient);

  /** The signed-in handler, remembered across reloads. */
  readonly currentUser = signal<User | null>(loadStoredUser());
  readonly isRegistering = signal(false);
  readonly isSigningIn = signal(false);

  /** Creates the user through `POST /api/users` and signs them in. */
  async registerUser(request: CreateUserRequest): Promise<User> {
    this.isRegistering.set(true);
    try {
      const user = await firstValueFrom(
        this.http.post<User>('/api/users', {
          ...request,
          phoneNumber: toE164(request.phoneNumber),
        }),
      );
      this.setCurrentUser(user);
      return user;
    } catch (err: unknown) {
      throw new Error(apiErrorMessage(err, 'Registration failed. Recheck credentials.'));
    } finally {
      this.isRegistering.set(false);
    }
  }

  /** Signs in through `POST /api/login`. During development any password is accepted. */
  async signIn(request: LoginRequest): Promise<User> {
    this.isSigningIn.set(true);
    try {
      const user = await firstValueFrom(this.http.post<User>('/api/login', request));
      this.setCurrentUser(user);
      return user;
    } catch (err: unknown) {
      throw new Error(apiErrorMessage(err, 'Authentication failed.'));
    } finally {
      this.isSigningIn.set(false);
    }
  }

  signOut(): void {
    this.setCurrentUser(null);
  }

  private setCurrentUser(user: User | null): void {
    this.currentUser.set(user);
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Storage can be unavailable (e.g. private browsing); the user just won't be remembered.
    }
  }
}

function loadStoredUser(): User | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as User) : null;
  } catch {
    return null;
  }
}

/** Accepts US numbers typed loosely, e.g. "555-656-0000"; numbers starting with + are kept as is. */
function toE164(phoneNumber: string): string {
  const trimmed = phoneNumber.trim();
  if (trimmed.startsWith('+')) {
    return `+${trimmed.replace(/\D/g, '')}`;
  }
  const digits = trimmed.replace(/\D/g, '');
  return `+1${digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits}`;
}

/** The server's `{error}` message, if it sent one. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof HttpErrorResponse) {
    const body: unknown = err.error;
    if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
      return body.error;
    }
  }
  return fallback;
}
