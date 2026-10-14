import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-landing',
  imports: [RouterLink, FormsModule],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class LandingComponent {
  protected readonly email = signal('');
  protected readonly passcode = signal('');
  protected readonly rememberHandler = signal(true);

  protected onSubmit(event: Event): void {
    event.preventDefault();
    // Handler authentication logic
  }
}

