import { Component } from '@angular/core';

@Component({
    selector: 'app-footer',
    standalone: true,
    template: `
        <div class="layout-footer">
            <div>
                <span>Ghana Waters Admin {{ version }} by </span>
                <a href="https://ghanamaritime.gov.gh/">Ghana Maritime Authority</a>
            </div>
        </div>
    `
})
export class AppFooterComponent {
//    // eslint-disable-next-line @typescript-eslint/no-var-requires
    version = '0.1'// require('package.json') && require('package.json').version;
}
