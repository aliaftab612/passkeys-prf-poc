import { Injectable } from '@angular/core';
import { isBrowserSupported } from '@passwordlessdev/passwordless-client';
import {
  PromiseResult,
  RegisterBeginResponse,
  SigninBeginResponse,
  SigninMethod,
  TokenResponse,
} from '@passwordlessdev/passwordless-client/dist/types';

type ErrorWithMessage = {
  message: string;
};

type TokenPrfResponse = {
  token: string;
  prfKey: string | null;
};

export interface Config {
  apiUrl: string;
  apiKey: string;
  origin: string;
  rpid: string;
}

@Injectable({
  providedIn: 'root',
})
export class PasswordlessService {
  private config: Config = {
    apiUrl: 'https://v4.passwordless.dev',
    apiKey: 'savepass:public:58bac7aa37834a7e883edc5e1cf40756',
    origin: window.location.origin,
    rpid: window.location.hostname,
  };

  private abortController: AbortController = new AbortController();

  private createHeaders(): Record<string, string> {
    return {
      ApiKey: this.config.apiKey,
      'Content-Type': 'application/json',
      'Client-Version': 'js-1.1.0',
    };
  }

  private assertBrowserSupported(): void {
    if (!isBrowserSupported()) {
      throw new Error(
        'WebAuthn and PublicKeyCredentials are not supported on this browser/device'
      );
    }
  }

  private async registerBegin(
    token: string
  ): PromiseResult<RegisterBeginResponse> {
    const response = await fetch(`${this.config.apiUrl}/register/begin`, {
      method: 'POST',
      headers: this.createHeaders(),
      body: JSON.stringify({
        token,
        RPID: this.config.rpid,
        Origin: this.config.origin,
      }),
    });

    const res = await response.json();
    if (response.ok) {
      return res;
    }

    return { error: { ...res, from: 'server' } };
  }

  private async registerComplete(
    credential: PublicKeyCredential,
    session: string
  ): PromiseResult<TokenPrfResponse> {
    const attestationResponse =
      credential.response as AuthenticatorAttestationResponse;

    const clientExtensionResults = credential.getClientExtensionResults();
    //@ts-ignore
    delete clientExtensionResults.prf;

    const response = await fetch(`${this.config.apiUrl}/register/complete`, {
      method: 'POST',
      headers: this.createHeaders(),
      body: JSON.stringify({
        session: session,
        response: {
          id: credential.id,
          rawId: this.arrayBufferToBase64Url(credential.rawId),
          type: credential.type,
          clientExtensionResults,
          response: {
            AttestationObject: this.arrayBufferToBase64Url(
              attestationResponse.attestationObject
            ),
            clientDataJson: this.arrayBufferToBase64Url(
              attestationResponse.clientDataJSON
            ),
          },
        },
        RPID: this.config.rpid,
        Origin: this.config.origin,
      }),
    });

    const res = await response.json();
    if (response.ok) {
      const extensionResults = credential.getClientExtensionResults();

      return {
        ...res,
        //@ts-ignore
        prfKey: extensionResults.prf?.enabled
          ? btoa(
              String.fromCharCode.apply(
                null,
                Array.from(
                  new Uint8Array(
                    //@ts-ignore
                    extensionResults.prf.results.first
                  )
                )
              )
            )
          : null,
      };
    }

    return { error: { ...res, from: 'server' } };
  }

  private arrayBufferToBase64Url(buffer: ArrayBuffer | Uint8Array): string {
    const uint8Array = (() => {
      if (Array.isArray(buffer)) return Uint8Array.from(buffer);
      if (buffer instanceof ArrayBuffer) return new Uint8Array(buffer);
      if (buffer instanceof Uint8Array) return buffer;

      const msg =
        'Cannot convert from ArrayBuffer to Base64Url. Input was not of type ArrayBuffer, Uint8Array or Array';
      console.error(msg, buffer);
      throw new Error(msg);
    })();

    let string = '';
    for (let i = 0; i < uint8Array.byteLength; i++) {
      string += String.fromCharCode(uint8Array[i]);
    }

    const base64String = window.btoa(string);
    return this.base64ToBase64Url(base64String);
  }

  private base64ToBase64Url(base64: string): string {
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=*$/g, '');
  }

  public async register(
    token: string,
    prf_salt: string
  ): PromiseResult<TokenPrfResponse> {
    try {
      this.assertBrowserSupported();
      this.handleAbort();

      const registration = await this.registerBegin(token);
      if (registration.error) {
        console.error(registration.error);
        return { error: registration.error };
      }

      registration.data.challenge = this.base64UrlToArrayBuffer(
        registration.data.challenge
      );
      registration.data.user.id = this.base64UrlToArrayBuffer(
        registration.data.user.id
      );
      registration.data.excludeCredentials?.forEach((cred) => {
        cred.id = this.base64UrlToArrayBuffer(cred.id);
      });

      //@ts-ignore
      registration.data.extensions.prf = { eval: {} };
      //@ts-ignore
      registration.data.extensions.prf.eval.first = new TextEncoder().encode(
        prf_salt
      );

      const credential = (await navigator.credentials.create({
        publicKey: registration.data,
        signal: this.abortController.signal,
      })) as PublicKeyCredential;

      if (!credential) {
        const error = {
          from: 'client',
          errorCode: 'failed_create_credential',
          title:
            'Failed to create credential (navigator.credentials.create returned null)',
        };
        console.error(error);
        return { error };
      }

      return await this.registerComplete(credential, registration.session);

      // next steps
      // return a token from the API
      // Add a type to the token (method/action)
    } catch (caughtError: any) {
      const errorMessage = this.getErrorMessage(caughtError);
      const error = {
        from: 'client',
        errorCode: 'unknown',
        title: errorMessage,
      };
      console.error(caughtError);
      console.error(error);

      return { error };
    }
  }

  private base64UrlToArrayBuffer(
    base64UrlString: string | BufferSource
  ): ArrayBuffer {
    // improvement: Remove BufferSource-type and add proper types upstream
    if (typeof base64UrlString !== 'string') {
      const msg =
        'Cannot convert from Base64Url to ArrayBuffer: Input was not of type string';
      console.error(msg, base64UrlString);
      throw new TypeError(msg);
    }

    const base64Unpadded = this.base64UrlToBase64(base64UrlString);
    const paddingNeeded = (4 - (base64Unpadded.length % 4)) % 4;
    const base64Padded = base64Unpadded.padEnd(
      base64Unpadded.length + paddingNeeded,
      '='
    );

    const binary = window.atob(base64Padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
  }

  private base64UrlToBase64(base64Url: string): string {
    return base64Url.replace(/-/g, '+').replace(/_/g, '/');
  }

  private getErrorMessage(error: unknown) {
    return this.toErrorWithMessage(error).message;
  }

  private toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
    if (this.isErrorWithMessage(maybeError)) return maybeError;

    try {
      return new Error(JSON.stringify(maybeError));
    } catch {
      // fallback in case there's an error stringifying the maybeError
      // like with circular references for example.
      return new Error(String(maybeError));
    }
  }

  private isErrorWithMessage(error: unknown): error is ErrorWithMessage {
    return (
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof (error as Record<string, unknown>)['message'] === 'string'
    );
  }

  public async signinWithAlias(
    alias: string,
    prf_salt: string
  ): PromiseResult<TokenPrfResponse> {
    return this.signin({ alias }, prf_salt);
  }

  public async signinWithAutofill(
    prf_salt: string
  ): PromiseResult<TokenPrfResponse> {
    if (!(await this.isAutofillSupported())) {
      throw new Error(
        'Autofill authentication (conditional meditation) is not supported in this browser'
      );
    }
    return this.signin({ autofill: true }, prf_salt);
  }

  private async isAutofillSupported(): Promise<boolean> {
    const PublicKeyCredential = window.PublicKeyCredential as any; // Typescript lacks support for this
    if (!PublicKeyCredential.isConditionalMediationAvailable) return false;
    return PublicKeyCredential.isConditionalMediationAvailable() as Promise<boolean>;
  }

  private handleAbort() {
    this.abort();
    this.abortController = new AbortController();
  }

  public abort() {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  private async signinBegin(
    signinMethod: SigninMethod
  ): PromiseResult<SigninBeginResponse> {
    const response = await fetch(`${this.config.apiUrl}/signin/begin`, {
      method: 'POST',
      headers: this.createHeaders(),
      body: JSON.stringify({
        userId: 'userId' in signinMethod ? signinMethod.userId : undefined,
        alias: 'alias' in signinMethod ? signinMethod.alias : undefined,
        RPID: this.config.rpid,
        Origin: this.config.origin,
      }),
    });

    const res = await response.json();
    if (response.ok) {
      return res;
    }

    return { error: { ...res, from: 'server' } };
  }

  private async signinComplete(
    credential: PublicKeyCredential,
    session: string
  ): PromiseResult<TokenPrfResponse> {
    const assertionResponse =
      credential.response as AuthenticatorAssertionResponse;

    const clientExtensionResults = credential.getClientExtensionResults();
    //@ts-ignore
    delete clientExtensionResults.prf;

    const response = await fetch(`${this.config.apiUrl}/signin/complete`, {
      method: 'POST',
      headers: this.createHeaders(),
      body: JSON.stringify({
        session: session,
        response: {
          id: credential.id,
          rawId: this.arrayBufferToBase64Url(new Uint8Array(credential.rawId)),
          type: credential.type,
          clientExtensionResults,
          response: {
            authenticatorData: this.arrayBufferToBase64Url(
              assertionResponse.authenticatorData
            ),
            clientDataJson: this.arrayBufferToBase64Url(
              assertionResponse.clientDataJSON
            ),
            signature: this.arrayBufferToBase64Url(assertionResponse.signature),
          },
        },
        RPID: this.config.rpid,
        Origin: this.config.origin,
      }),
    });

    const res = await response.json();
    if (response.ok) {
      const extensionResults = credential.getClientExtensionResults();

      return {
        ...res,
        //@ts-ignore
        prfKey: extensionResults.prf?.results?.first
          ? btoa(
              String.fromCharCode.apply(
                null,
                Array.from(
                  new Uint8Array(
                    //@ts-ignore
                    extensionResults.prf.results.first
                  )
                )
              )
            )
          : null,
      };
    }

    return { error: { ...res, from: 'server' } };
  }

  private async signin(
    signinMethod: SigninMethod,
    prf_salt: string
  ): PromiseResult<TokenPrfResponse> {
    try {
      this.assertBrowserSupported();
      this.handleAbort();

      // if signinMethod is undefined, set it to an empty object
      // this will cause a login using discoverable credentials
      if (!signinMethod) {
        signinMethod = { discoverable: true };
      }

      const signin = await this.signinBegin(signinMethod);
      if (signin.error) {
        return signin;
      }

      signin.data.challenge = this.base64UrlToArrayBuffer(
        signin.data.challenge
      );
      signin.data.allowCredentials?.forEach((cred) => {
        cred.id = this.base64UrlToArrayBuffer(cred.id);
      });

      //@ts-ignore
      signin.data.extensions = { prf: { eval: {} } };
      //@ts-ignore
      signin.data.extensions.prf.eval.first = new TextEncoder().encode(
        prf_salt
      );

      const credential = (await navigator.credentials.get({
        publicKey: signin.data,
        mediation:
          'autofill' in signinMethod
            ? ('conditional' as CredentialMediationRequirement)
            : undefined, // Typescript doesn't know about 'conditational' yet
        signal: this.abortController.signal,
      })) as PublicKeyCredential;

      const response = await this.signinComplete(credential, signin.session);
      return response;
    } catch (caughtError: any) {
      const errorMessage = this.getErrorMessage(caughtError);
      const error = {
        from: 'client',
        errorCode: 'unknown',
        title: errorMessage,
      };
      console.error(caughtError);
      console.error(error);

      return { error };
    }
  }
}
