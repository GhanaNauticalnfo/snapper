# Boat Icon Component

A reusable boat icon component for displaying vessel types with their associated colors.

## Usage

```typescript
import { BoatIconComponent } from '@snapper/shared';
```

```html
<!-- Basic usage -->
<app-boat-icon color="#3B82F6" [size]="24"></app-boat-icon>

<!-- With stroke and styling -->
<app-boat-icon 
  color="#10B981" 
  [size]="32"
  strokeColor="#000000"
  [strokeWidth]="1"
  cssClass="boat-icon-highlight"
  title="Fishing Boat">
</app-boat-icon>
```

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `color` | `string` | `'#3B82F6'` | Fill color of the boat icon |
| `size` | `number \| string` | `24` | Width and height of the icon |
| `strokeColor` | `string` | `undefined` | Optional stroke color for outline |
| `strokeWidth` | `number` | `0` | Stroke width for outline |
| `cssClass` | `string` | `''` | Additional CSS classes |
| `title` | `string` | `undefined` | Tooltip/accessibility title |

## CSS Classes

The component provides built-in CSS classes for common styling:

- `boat-icon-shadow`: Enhanced shadow effect
- `boat-icon-highlight`: Blue glow effect for emphasis

## Examples

### Vessel Type Display
```html
<app-boat-icon 
  [color]="vesselType.color" 
  [size]="32"
  [title]="vesselType.name">
</app-boat-icon>
```

### Live Map Markers
```html
<app-boat-icon 
  [color]="vessel.vesselType.color" 
  [size]="16"
  cssClass="map-vessel-icon"
  [title]="vessel.name">
</app-boat-icon>
```

### Settings Preview
```html
<app-boat-icon 
  [color]="selectedColor" 
  [size]="40"
  cssClass="boat-icon-highlight">
</app-boat-icon>
```