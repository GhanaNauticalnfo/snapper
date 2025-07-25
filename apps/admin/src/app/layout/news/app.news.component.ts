import News from '../../../assets/data/news.json';
import { AppConfigService } from '../../service/appconfigservice';
import { CommonModule } from '@angular/common';
import { afterNextRender, ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StyleClass } from 'primeng/styleclass';

@Component({
    selector: 'app-news',
    standalone: true,
    templateUrl: './app.news.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule]
})
export class AppNewsComponent {
    storageKey = 'primeng';

    announcement: any;

    constructor(
        private configService: AppConfigService,
        private cd: ChangeDetectorRef
    ) {
        afterNextRender(() => {
            const itemString = localStorage.getItem(this.storageKey);

            if (itemString) {
                const item = JSON.parse(itemString);

                if (!item.hiddenNews || item.hiddenNews !== News.id) {
                    this.configService.newsActive.set(true);
                    this.announcement = News;
                } else {
                    this.configService.newsActive.set(false);
                }
            } else {
                this.configService.newsActive.set(true);
                this.announcement = News;
            }
            this.cd.markForCheck();
        });
    }

    get isNewsActive(): boolean {
        return this.configService.newsActive();
    }

    hideNews() {
        this.configService.hideNews();
        const item = {
            hiddenNews: this.announcement.id
        };

        localStorage.setItem(this.storageKey, JSON.stringify(item));
    }
}
