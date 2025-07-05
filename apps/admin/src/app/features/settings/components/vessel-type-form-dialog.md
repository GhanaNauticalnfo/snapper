# Vessel Type Form Dialog Component

## Overview
Modal dialog for creating and editing vessel types. Replaces the previous navigation-based approach with an in-place modal popup.

## Features
- Create new vessel types with name and color
- Edit existing vessel types (future functionality)
- Live preview of boat icon with selected color
- Form validation (name required, max 30 chars)
- Success/error toast notifications
- Clean modal UI following PrimeNG patterns

## Usage
```typescript
// In parent component template:
<app-vessel-type-form-dialog
  [(visible)]="showFormDialog"
  [vesselType]="selectedVesselType"
  (vesselTypeSaved)="onVesselTypeSaved($event)"
></app-vessel-type-form-dialog>

// To open for creating new vessel type:
openCreateDialog() {
  this.selectedVesselType = null;
  this.showFormDialog = true;
}

// To open for editing (future):
openEditDialog(vesselType: VesselType) {
  this.selectedVesselType = vesselType;
  this.showFormDialog = true;
}
```

## API Integration
- Uses VesselTypeService for create/update operations
- Emits saved vessel type on successful save
- Displays API error messages in the dialog

## Styling
- Follows existing admin dashboard styling patterns
- Uses PrimeNG theme variables
- Responsive layout for mobile devices