import { CommonModule, NgFor } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { Subscription } from 'rxjs';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { EmailValidatorDirective } from '../directives/emailValidator';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    RouterModule,
    NgxSpinnerModule,
    ToastModule,
    ButtonModule,
    EmailValidatorDirective,
  ],
  providers: [MessageService],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css',
})
export class SignupComponent implements OnDestroy, OnInit {
  subscription: Subscription = new Subscription();
  constructor(
    private authService: AuthService,
    private ngxSpinnerservice: NgxSpinnerService,
    private msgService: MessageService
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

  async onSubmit(form: NgForm) {
    try {
      if (form.valid) {
        await this.authService.signup(form.value.name, form.value.email);
      }
    } catch (err: any) {
      this.generateErrorMessage(err);
    }
  }

  generateErrorMessage(err: any) {
    if (!err?.errorCode) {
      if (err?.name === 'HttpErrorResponse' && err?.error?.status === 'fail') {
        this.showError(err.message + ' | ' + err.error.message);
      } else {
        this.showError(err.message);
      }
    } else if (
      err?.errorCode === 'unknown' &&
      !err?.title.startsWith(
        'The operation either timed out or was not allowed.'
      ) &&
      !err.title.startsWith('signal is aborted without reason')
    ) {
      this.showError('PasswordLess Service Error : ' + err.title);
    }
  }

  showError(error: string) {
    this.msgService.add({
      severity: 'error',
      summary: 'Error',
      detail: error,
      life: 3500,
    });
  }
}
