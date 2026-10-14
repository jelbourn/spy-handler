import { Injectable, signal } from '@angular/core';
import type { CreateUserRequest, User } from '../../../shared/models.ts';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  readonly currentUser = signal<User | null>(null);
  readonly isRegistering = signal(false);
  readonly registrationError = signal<string | null>(null);

  /**
   * Stub registration logic. Simulates a network request and sets the current user in memory.
   * Can easily be switched to HttpClient call to `/api/users`.
   */
  async registerUser(request: CreateUserRequest): Promise<User> {
    this.isRegistering.set(true);
    this.registrationError.set(null);

    try {
      // Simulate network latency
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Normalize phone number to E.164 if simple digits provided
      let normalizedPhone = request.phoneNumber.trim();
      if (!normalizedPhone.startsWith('+')) {
        const digits = normalizedPhone.replace(/\D/g, '');
        normalizedPhone = `+1${digits.length === 10 ? digits : digits.slice(-10)}`;
      }

      const mockUser: User = {
        id: Math.floor(Math.random() * 1000) + 1,
        username: request.username.trim(),
        phoneNumber: normalizedPhone,
        handle: request.handle.trim(),
      };

      this.currentUser.set(mockUser);
      return mockUser;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      this.registrationError.set(message);
      throw err;
    } finally {
      this.isRegistering.set(false);
    }
  }
}

