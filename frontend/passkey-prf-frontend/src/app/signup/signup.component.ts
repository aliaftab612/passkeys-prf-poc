import { CommonModule, NgFor } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule, NgxSpinnerModule],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css',
})
export class SignupComponent implements OnDestroy, OnInit {
  subscription: Subscription = new Subscription();
  constructor(
    private authService: AuthService,
    private ngxSpinnerservice: NgxSpinnerService
  ) {}
  ngOnInit(): void {
    this.subscription = this.authService
      .getSignUpStatusObservable()
      .subscribe((value) => {
        if (value === 0) this.ngxSpinnerservice.show();
        else this.ngxSpinnerservice.hide();
      });
  }

  ngOnDestroy(): void {
    this.authService.signupOrSigninAbort();
    this.subscription.unsubscribe();
    this.ngxSpinnerservice.hide();
  }

  onSubmit(form: NgForm) {
    if (form.valid) {
      this.authService.signup(form.value.name, form.value.email);
    }
  }
}
