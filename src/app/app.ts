import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { TopNav } from './shared/top-nav';
import { CurrentUserService } from './core/services/current-user.service';
import { ToastService } from './core/services/toast.service';
import { Icon } from './shared/icon';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TopNav, Icon],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly toast = inject(ToastService);
  protected readonly currentUser = inject(CurrentUserService);
}
