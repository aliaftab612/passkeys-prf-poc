import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { encryptString, decryptString } from '../utility/cryptoHelper';
import { DataStorageService } from '../services/data-storage.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  encryptedString: string = '';
  decryptedString: string = '';
  inputValue: string = '';
  resetClicked: boolean = false;

  constructor(
    private authService: AuthService,
    private dataStorageService: DataStorageService
  ) {}

  async ngOnInit() {
    this.encryptedString = await this.dataStorageService.getEncryptedString();
  }

  async encrypt(form: NgForm) {
    if (form.valid) {
      const encryptionKey = this.authService.getEncryptionKey();
      if (encryptionKey) {
        const encryptedString = await encryptString(
          form.value.userinput,
          encryptionKey
        );

        await this.dataStorageService.saveEncryptedString(encryptedString);
        this.decryptedString = '';
        this.encryptedString = encryptedString;
      }
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
    this.resetClicked = true;
    this.inputValue = '';
    this.decryptedString = '';
  }
}
