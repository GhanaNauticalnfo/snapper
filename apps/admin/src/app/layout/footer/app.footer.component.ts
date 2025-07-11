import { Component } from '@angular/core';
import { environment } from '../../../environments/environment';

@Component({
    selector: 'app-footer',
    standalone: true,
    template: `
        <div class="layout-footer">
            <div>
                <span>Ghana Waters Admin ({{ buildTag }}) by </span>
                <a href="https://ghanamaritime.gov.gh/">Ghana Maritime Authority</a>
            </div>
        </div>
    `
})
export class AppFooterComponent {
    buildTag = environment.buildTag;
}
