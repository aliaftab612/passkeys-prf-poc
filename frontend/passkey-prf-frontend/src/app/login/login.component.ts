import { CommonModule } from '@angular/common';
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
  selector: 'app-login',
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
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnDestroy, OnInit {
  subscription: Subscription = new Subscription();

  constructor(
    private authService: AuthService,
    private ngxSpinnerservice: NgxSpinnerService,
    private msgService: MessageService
  ) {
    this.setUpsigninWithAutofill();
  }
  ngOnInit(): void {
    this.subscription = this.authService
      .getAutofillSignInVerificationStartedObservable()
      .subscribe(() => this.ngxSpinnerservice.show());
  }
  ngOnDestroy(): void {
    this.authService.signupOrSigninAbort();
    this.subscription.unsubscribe();
  }

  async setUpsigninWithAutofill() {
    try {
      await this.authService.signinWithAutofill();
      this.ngxSpinnerservice.hide();
    } catch (error: any) {
      this.generateErrorMessage(error);
      if (error?.errorCode !== 'AbortError') {
        this.setUpsigninWithAutofill();
        this.ngxSpinnerservice.hide();
      }
    }
  }

  async onSubmit(form: NgForm) {
    try {
      if (form.valid) {
        this.ngxSpinnerservice.show();
        // Register the token with the end-user's device.
        await this.authService.signinWithAlias(form.value.email);
        this.ngxSpinnerservice.hide();
        //if (error) {
        //  this.ui();
        //}
        /*Define publicKeyCredentialCreationOptions
      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions =
        {
          rp: { name: 'website' },
          user: {
            id: this.str2ab('wdfeeefvewre3t54t'),
            displayName: 'User 1',
            name: 'aftah',
          },
          challenge: new Uint8Array(16), // Add the challenge property
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }],

          timeout: 60000,
          attestation: 'direct' as AttestationConveyancePreference,
          authenticatorSelection: {
            requireResidentKey: true,
            userVerification: 'required',
          },
          extensions: {
            // @ts-ignore
            prf: {
              eval: {
                first: new Uint8Array(new Array(32).fill(1)),
              },
            },
          },
        };

      // Create credential
      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      });

      // @ts-ignore
      console.log(credential.getClientExtensionResults());
      */
      }
    } catch (err: any) {
      this.ngxSpinnerservice.hide();
      this.generateErrorMessage(err);
      this.setUpsigninWithAutofill();
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
      !(err?.errorCode === 'NotAllowedError' || err?.errorCode === 'AbortError')
    ) {
      this.showError('PasswordLess Service Error : ' + err.title);
    }
  }

  str2ab(str: string) {
    var buf = new ArrayBuffer(str.length * 2); // 2 bytes for each char
    var bufView = new Uint16Array(buf);
    for (var i = 0, strLen = str.length; i < strLen; i++) {
      bufView[i] = str.charCodeAt(i);
    }
    return buf;
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
