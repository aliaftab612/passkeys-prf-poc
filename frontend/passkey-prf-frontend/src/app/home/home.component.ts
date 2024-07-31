import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { encryptString, decryptString } from '../utility/cryptoHelper';
import { DataStorageService } from '../services/data-storage.service';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule, CommonModule, NgxSpinnerModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  @ViewChild('form')
  form!: NgForm;
  encryptedString: string = '';
  decryptedString: string = '';
  inputValue: string = '';
  prfNotSupported: boolean = false;

  constructor(
    private authService: AuthService,
    private dataStorageService: DataStorageService,
    private ngxSpinnerservice: NgxSpinnerService
  ) {}

  ngOnInit() {
    this.initializeData();
  }

  async initializeData() {
    try {
      if (
        !this.authService.getEncryptionKey() &&
        this.authService.getAuthToken()
      ) {
        this.prfNotSupported = true;
        return;
      }

      this.ngxSpinnerservice.show();
      this.encryptedString = await this.dataStorageService.getEncryptedString();
      this.ngxSpinnerservice.hide();
    } catch (err) {
      this.ngxSpinnerservice.hide();
    }
  }

  async encrypt() {
    try {
      if (this.form.valid) {
        const encryptionKey = this.authService.getEncryptionKey();
        if (encryptionKey) {
          const encryptedString = await encryptString(
            this.form.value.userinput,
            encryptionKey
          );

          this.ngxSpinnerservice.show();
          await this.dataStorageService.saveEncryptedString(encryptedString);
          this.ngxSpinnerservice.hide();
          this.decryptedString = '';
          this.encryptedString = encryptedString;
        }
      }
    } catch (err) {
      this.ngxSpinnerservice.hide();
    }
  }

  async decrypt(encryptedString: string) {
    const encryptionKey = this.authService.getEncryptionKey();

    if (encryptionKey) {
      this.decryptedString = await decryptString(
        encryptedString,
        encryptionKey
      );
    }
  }

  signOutButtonClick() {
    this.authService.signOut();
  }

  resetClick() {
    this.inputValue = '';
    this.decryptedString = '';
  }
}
