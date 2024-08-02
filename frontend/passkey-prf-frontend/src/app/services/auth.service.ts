import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { lastValueFrom, Observable, Subject } from 'rxjs';
import { PasswordlessService } from './passwordless.service';
import { Router } from '@angular/router';
import { generateAESKeyFromWebAuthnKey } from './../utility/cryptoHelper';

const prf_salt = 'passwordless-login';

type SignupBeginResponse = {
  status: string;
  token: string;
  userId: string;
};

enum SignUpStatusValues {
  SIGNUP_STARTED,
  SIGNUP_ENDED,
}

type SignupCompleteResponse = {
  status: string;
  auth_token: string;
};

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private authToken: string | null = null;
  private encryptionKey: CryptoKey | null = null;
  private autofillSignInVerificationStarted = new Subject<boolean>();
  private signUpStatus = new Subject<SignUpStatusValues>();

  constructor(
    private http: HttpClient,
    private passwordless: PasswordlessService,
    private router: Router
  ) {}

  getAuthToken() {
    return this.authToken !== null ? `${this.authToken}` : null;
  }

  getEncryptionKey() {
    return this.encryptionKey;
  }

  async signup(name: string, email: string) {
    try {
      this.signUpStatus.next(SignUpStatusValues.SIGNUP_STARTED);
      const { token: registrationToken, userId } = await lastValueFrom(
        this.http.post<SignupBeginResponse>(
          `${environment.serverBaseUrl}/api/v1/signup/begin`,
          { name, email }
        )
      );

      const { token, prfKey, error } = await this.passwordless.register(
        registrationToken,
        prf_salt
      );

      if (error) throw error;

      this.authToken = (
        await lastValueFrom(
          this.http.post<SignupCompleteResponse>(
            `${environment.serverBaseUrl}/api/v1/signup/complete`,
            { userId }
          )
        )
      ).auth_token;

      if (prfKey) {
        this.encryptionKey = await generateAESKeyFromWebAuthnKey(prfKey);
      }
      this.signUpStatus.next(SignUpStatusValues.SIGNUP_ENDED);
      this.router.navigate(['/home']);
    } catch (err) {
      this.signUpStatus.next(SignUpStatusValues.SIGNUP_ENDED);
      throw err;
    }
  }

  async signinWithAutofill() {
    const { token, error, prfKey } = await this.passwordless.signinWithAutofill(
      prf_salt
    );

    if (error) throw error;
    this.autofillSignInVerificationStarted.next(true);
    await this.verifySignin(token, prfKey);
  }

  async signinWithAlias(alias: string) {
    const { token, error, prfKey } = await this.passwordless.signinWithAlias(
      alias,
      prf_salt
    );

    if (error) throw error;

    await this.verifySignin(token, prfKey);
  }

  private async verifySignin(token: string, prfKey: string | null) {
    this.authToken = (
      await lastValueFrom(
        this.http.post<SignupCompleteResponse>(
          `${environment.serverBaseUrl}/api/v1/signin`,
          { token }
        )
      )
    ).auth_token;

    if (prfKey) {
      this.encryptionKey = await generateAESKeyFromWebAuthnKey(prfKey);
    }

    this.router.navigate(['/home']);
  }

  signupOrSigninAbort() {
    this.passwordless.abort();
  }

  signOut() {
    this.authToken = null;
    this.encryptionKey = null;
    this.router.navigate(['/login']);
  }

  getAutofillSignInVerificationStartedObservable(): Observable<boolean> {
    return this.autofillSignInVerificationStarted.asObservable();
  }

  getSignUpStatusObservable(): Observable<SignUpStatusValues> {
    return this.signUpStatus.asObservable();
  }
}
