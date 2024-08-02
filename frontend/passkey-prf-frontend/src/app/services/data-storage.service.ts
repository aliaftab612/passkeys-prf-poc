import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DataStorageService {
  constructor(private authService: AuthService, private http: HttpClient) {}
  authToken = this.authService.getAuthToken();

  async saveEncryptedString(value: string) {
    const authToken = this.authService.getAuthToken();
    if (!authToken) return;

    return await lastValueFrom(
      this.http.patch(
        `${environment.serverBaseUrl}/api/v1/encryptedData`,
        { encryptedData: value },
        {
          headers: { Authorization: 'Bearer ' + authToken },
        }
      )
    );
  }

  async getEncryptedString() {
    const authToken = this.authService.getAuthToken();
    if (!authToken) return '';

    return (
      await lastValueFrom(
        this.http.get<{ status: string; encryptedData: string }>(
          `${environment.serverBaseUrl}/api/v1/encryptedData`,
          {
            headers: { Authorization: 'Bearer ' + authToken },
          }
        )
      )
    ).encryptedData;
  }
}
