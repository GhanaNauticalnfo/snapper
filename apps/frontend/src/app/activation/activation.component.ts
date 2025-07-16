import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { QRCodeComponent } from 'angularx-qrcode';

@Component({
  selector: 'app-activation',
  standalone: true,
  imports: [CommonModule, QRCodeComponent],
  template: `
    <div class="activation-container">
      <div class="activation-card">
        <div class="header text-center">
          <h1 class="text-2xl">🚢 Ghana Maritime Authority</h1>
          <h2 class="text-lg font-normal">Device Activation</h2>
        </div>
        
        @if (activationToken()) {
          <div class="activation-content">
            <div class="token-display text-center">
              <p class="font-bold">Activation Token:</p>
              <div class="token-code text-base font-bold">{{ activationToken() }}</div>
            </div>
            
            <div class="instructions">
              <h3>📱 To activate your device:</h3>
              <ol class="leading-normal">
                <li>Make sure the Ghana Maritime app is installed on your phone</li>
                <li>Click the button below to activate</li>
                <li>The app will open and connect automatically</li>
              </ol>
            </div>
            
            <div class="activation-actions">
              <a 
                [href]="getActivationUrl()" 
                class="activation-button text-base font-bold text-center no-underline"
                (click)="handleActivationClick($event)"
              >
                📲 Activate Device
              </a>
              
              <button 
                class="copy-button text-base font-bold" 
                (click)="copyActivationUrl()"
              >
                📋 Copy Link
              </button>
            </div>
            
            <div class="manual-activation">
              <p class="font-bold">If the button doesn't work:</p>
              <ol class="leading-normal">
                <li>Make sure Ghana Maritime app is installed</li>
                <li>Copy this URL: <code class="text-sm">{{ getActivationUrl() }}</code></li>
                <li>Open any app that supports links (WhatsApp, Notes, etc.)</li>
                <li>Paste and click the link</li>
              </ol>
            </div>
            
            <div class="qr-section text-center">
              <p><span class="font-bold">Alternative:</span> Scan this QR code with your phone's camera</p>
              <div class="qr-code-container">
                <qrcode 
                  [qrdata]="getActivationUrl()" 
                  [width]="200"
                  [errorCorrectionLevel]="'M'"
                  [margin]="4">
                </qrcode>
              </div>
              <small>Scan with your phone's camera to activate</small>
            </div>
          </div>
        } @else {
          <div class="error-content text-center">
            <h3>❌ Invalid Activation Link</h3>
            <p>This activation link is missing the required token.</p>
            <p>Please contact your supervisor for a valid activation link.</p>
          </div>
        }
        
        <div class="footer text-center">
          <p><small>Ghana Maritime Authority - Vessel Tracking System</small></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .activation-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #1e3c72, #2a5298);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      font-family: Arial, sans-serif;
    }
    
    .activation-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      max-width: 500px;
      width: 100%;
      overflow: hidden;
    }
    
    .header {
      background: #1e3c72;
      color: white;
      padding: 30px 20px;
    }
    
    .header h1 {
      margin: 0 0 10px 0;
    }
    
    .header h2 {
      margin: 0;
      opacity: 0.9;
    }
    
    .activation-content, .error-content {
      padding: 30px 20px;
      color: #333;
    }
    
    .token-display {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 20px;
      color: #333;
    }
    
    .token-display p {
      color: #333;
      margin: 0;
    }
    
    .token-code {
      font-family: monospace;
      color: #1e3c72;
      background: white;
      padding: 10px;
      border-radius: 4px;
      border: 2px solid #1e3c72;
      margin-top: 10px;
    }
    
    .instructions {
      margin-bottom: 25px;
    }
    
    .instructions h3 {
      color: #1e3c72;
      margin-bottom: 15px;
    }
    
    .instructions ol {
      padding-left: 20px;
      color: #333;
    }
    
    .instructions li {
      margin-bottom: 8px;
      color: #333;
    }
    
    .activation-actions {
      display: flex;
      gap: 15px;
      margin-bottom: 25px;
      flex-wrap: wrap;
    }
    
    .activation-button {
      background: #28a745;
      color: white;
      padding: 15px 25px;
      border-radius: 8px;
      flex: 1;
      min-width: 200px;
      transition: background 0.3s;
    }
    
    .activation-button:hover {
      background: #218838;
    }
    
    .copy-button {
      background: #007bff;
      color: white;
      border: none;
      padding: 15px 20px;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.3s;
    }
    
    .copy-button:hover {
      background: #0056b3;
    }
    
    .qr-section {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      color: #333;
    }
    
    .qr-section p {
      color: #333;
    }
    
    .qr-code-container {
      background: white;
      border-radius: 8px;
      padding: 20px;
      margin: 15px auto;
      display: inline-block;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .qr-section small {
      color: #666;
      display: block;
      margin-top: 10px;
    }
    
    .footer {
      background: #f8f9fa;
      padding: 15px 20px;
      border-top: 1px solid #dee2e6;
      color: #666;
    }
    
    .error-content {
    }
    
    .error-content h3 {
      color: #dc3545;
      margin-bottom: 15px;
    }
    
    .manual-activation {
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 8px;
      padding: 15px;
      margin-top: 20px;
      color: #856404;
    }
    
    .manual-activation p {
      margin: 0 0 10px 0;
      color: #856404;
    }
    
    .manual-activation ol {
      margin: 0;
      padding-left: 20px;
      color: #856404;
    }
    
    .manual-activation li {
      margin-bottom: 5px;
    }
    
    .manual-activation code {
      background: #fff;
      padding: 2px 4px;
      border-radius: 3px;
      font-family: monospace;
      word-break: break-all;
    }
    
    @media (max-width: 600px) {
      .activation-actions {
        flex-direction: column;
      }
      
      .activation-button {
        min-width: auto;
      }
    }
  `]
})
export class ActivationComponent implements OnInit {
  activationToken = signal<string | null>(null);

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.activationToken.set(params['token'] || null);
    });
  }

  getActivationUrl(): string {
    return `ghmaritimeapp://auth?token=${this.activationToken()}`;
  }

  copyActivationUrl(): void {
    const url = this.getActivationUrl();
    navigator.clipboard.writeText(url).then(() => {
      alert('Activation link copied to clipboard!');
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Activation link copied to clipboard!');
    });
  }

  handleActivationClick(event: Event): void {
    // Let the browser handle the custom URL scheme
    console.log('Activation URL clicked:', this.getActivationUrl());
    
    // Show a message after a delay in case the app doesn't open
    setTimeout(() => {
      if (document.hasFocus()) {
        alert('If the app did not open, please make sure:\n\n1. Ghana Maritime app is installed\n2. Try copying the link and opening it in another app');
      }
    }, 1000);
  }
}