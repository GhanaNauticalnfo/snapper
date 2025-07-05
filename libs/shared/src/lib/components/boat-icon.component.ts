import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-boat-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg 
      viewBox="0 0 24 24" 
      [attr.width]="size" 
      [attr.height]="size"
      [class]="cssClass"
      [attr.title]="title"
    >
      <path 
        d="M12 3 L20 16 L12 13 L4 16 Z" 
        [attr.fill]="color"
        [attr.stroke]="strokeColor || '#000000'"
        [attr.stroke-width]="strokeWidth || 1.5"
        stroke-linejoin="round"
      />
    </svg>
  `,
  styles: [`
    svg {
      display: block;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
      transition: all 0.2s ease;
    }
    
    svg:hover {
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15));
    }
    
    .boat-icon-shadow {
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
    }
    
    .boat-icon-highlight {
      filter: drop-shadow(0 2px 8px rgba(59, 130, 246, 0.4));
    }
  `]
})
export class BoatIconComponent {
  /**
   * The fill color of the boat icon
   */
  @Input() color: string = '#3B82F6';
  
  /**
   * The size of the icon (width and height)
   */
  @Input() size: number | string = 24;
  
  /**
   * Optional stroke color for the boat outline
   */
  @Input() strokeColor?: string;
  
  /**
   * Stroke width for the boat outline
   */
  @Input() strokeWidth: number = 0;
  
  /**
   * Optional CSS class for additional styling
   */
  @Input() cssClass: string = '';
  
  /**
   * Optional title for accessibility/tooltip
   */
  @Input() title?: string;
}