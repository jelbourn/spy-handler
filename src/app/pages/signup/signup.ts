import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-signup',
  imports: [RouterLink, FormsModule],
  templateUrl: './signup.html',
  styleUrl: './signup.scss',
})
export class SignupComponent {
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);

  protected readonly handlerName = signal('mark@omb.agency');
  protected readonly phone = signal('555-656-0000');
  protected readonly passcode = signal('dsvkleb34234');

  protected readonly isSubmitting = this.userService.isRegistering;
  protected readonly errorMessage = signal<string | null>(null);

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.errorMessage.set(null);

    const username = this.handlerName().trim();
    const phoneNumber = this.phone().trim();

    if (!username || !phoneNumber) {
      this.errorMessage.set('All identification fields must be completed.');
      return;
    }

    try {
      await this.userService.registerUser({
        username,
        phoneNumber,
      });

      // Navigate to mission requisition on success
      await this.router.navigate(['/missions']);
    } catch (err: unknown) {
      this.errorMessage.set(
        err instanceof Error ? err.message : 'Registration failed. Recheck credentials.'
      );
    }
  }
}

