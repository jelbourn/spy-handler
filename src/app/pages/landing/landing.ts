import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-landing',
  imports: [RouterLink, FormsModule],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class LandingComponent {
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);

  protected readonly username = signal('');
  protected readonly passcode = signal('');
  protected readonly rememberHandler = signal(true);

  protected readonly isSigningIn = this.userService.isSigningIn;
  protected readonly errorMessage = signal<string | null>(null);

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.errorMessage.set(null);
    try {
      await this.userService.signIn({ username: this.username(), password: this.passcode() });
      await this.router.navigate(['/missions']);
    } catch (err: unknown) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Authentication failed.');
    }
  }
}
