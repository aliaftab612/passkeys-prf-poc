import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { lastValueFrom } from 'rxjs';
import { PasswordlessService } from './passwordless.service';
import { Router } from '@angular/router';

const prf_salt = 'passwordless-login';

type SignupBeginResponse = {
  status: string;
  token: string;
  userId: string;
};

type SignupCompleteResponse = {
  status: string;
  auth_token: string;
};

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private authToken: string | null = null;
  private prfKey: string | null = null;

  constructor(
    private http: HttpClient,
    private passwordless: PasswordlessService,
    private router: Router
  ) {}

  getAuthToken() {
    return this.authToken !== null ? `${this.authToken}` : null;
  }

  getPrfKey() {
    return this.prfKey !== null ? `${this.prfKey}` : null;
  }

  async signup(name: string, email: string) {
    try {
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

      this.prfKey = prfKey;

      this.router.navigate(['/home']);
    } catch (err) {
      console.log(err);
    }
  }

  async signinWithAutofill() {
    const { token, error, prfKey } = await this.passwordless.signinWithAutofill(
      prf_salt
    );

    if (error) throw error;

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

    this.prfKey = prfKey;

    this.router.navigate(['/home']);
  }

  signupOrSigninAbort() {
    this.passwordless.abort();
  }
}
