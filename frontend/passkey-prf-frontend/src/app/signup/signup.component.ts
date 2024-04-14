import { CommonModule, NgFor } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css',
})
export class SignupComponent implements OnDestroy {
  constructor(private authService: AuthService) {}

  ngOnDestroy(): void {
    this.authService.signupOrSigninAbort();
  }

  onSubmit(form: NgForm) {
    if (form.valid) {
      this.authService.signup(form.value.name, form.value.email);
    }
  }
}
