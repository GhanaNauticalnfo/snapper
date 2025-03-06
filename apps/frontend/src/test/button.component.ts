import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';

@Component({
    selector: 'app-buttondemo',
    templateUrl: './button.component.html',
    standalone: true,
    imports: [ButtonModule]
})
export class ButtonComponent  {}