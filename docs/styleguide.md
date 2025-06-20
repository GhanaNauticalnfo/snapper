# Snapper Admin Style Guide

This document outlines the coding standards and UI patterns for the Snapper Admin application.

## Page Structure

### Page Headers

All list pages in the admin dashboard **MUST** include a consistent page header with title and divider. This provides visual consistency across the application.

#### Required Pattern

```typescript
@Component({
  selector: 'app-[feature-name]',
  template: `
    <div class="[feature-name]-container">
      <div class="page-header">
        <h2>[Page Title]</h2>
      </div>
      <!-- Page content here -->
    </div>
  `,
  styles: [`
    .[feature-name]-container {
      padding: 0 20px 20px 20px;
    }
  `]
})
```

#### Example Implementation

```typescript
// From settings.component.ts
template: `
  <div class="settings-container">
    <div class="page-header">
      <h2>Settings</h2>
    </div>
    <!-- Settings content -->
  </div>
`,
styles: [`
  .settings-container {
    padding: 0 20px 20px 20px;
  }
`]
```

#### Global Styles

The page-header styles are defined globally in `apps/admin/src/styles.css`:

```css
.page-header {
  margin-bottom: 2rem;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 1rem;
}

.page-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
}
```

## Component Patterns

### List Components

When creating list components (e.g., vessels, routes, landing sites), use the shared `ResourceListComponent` from `@snapper/shared` for consistency.

#### Standard Features
- Search bar with icon
- "New [Entity]" button
- Paginated table
- View/Edit/Delete actions
- Loading states
- Empty states

### Form Components

#### Dialog Forms
- Use PrimeNG Dialog component
- Include mode: 'view' | 'edit' | 'create'
- Implement proper validation
- Show loading states during save operations

## Angular Best Practices

### Component Structure
1. Use standalone components (Angular 19)
2. Implement proper TypeScript interfaces
3. Use signals for reactive state management
4. Follow Angular's OnPush change detection strategy where possible

### Styling Guidelines

#### Host Classes
Always add a host class to components for consistent styling:

```typescript
@Component({
  selector: 'app-example',
  host: { class: 'example-host' },
  // ...
})
```

#### Avoid ::ng-deep
**NEVER** use `::ng-deep` as it's deprecated. Instead:
- Add host classes to components
- Move third-party component styling to global styles with host class prefix

Example:
```css
/* In global styles.css */
.example-host .p-datatable .p-datatable-thead > tr > th {
  background-color: var(--surface-100);
}
```

### PrimeNG Components

#### Current Components Only
- ✅ Use: `p-tabs`, `p-tabPanel`, `TabMenu`
- ❌ Avoid: `TabView` (deprecated)
- Always check [PrimeNG Documentation](https://primeng.org/) for current component status

### CSS Utility Classes - CRITICAL

#### Use Tailwind CSS Only
**NEVER use PrimeFlex** - PrimeFlex is deprecated and should not be used anywhere in the codebase.

- ✅ **USE**: Tailwind CSS utilities for all styling needs
- ❌ **NEVER USE**: PrimeFlex classes (e.g., `justify-content-between`, `align-items-center`)

#### Common PrimeFlex to Tailwind Migrations

| PrimeFlex Class | Tailwind Equivalent |
|-----------------|--------------------|
| `flex` | `flex` |
| `flex-row` | `flex-row` |
| `flex-column` | `flex-col` |
| `justify-content-start` | `justify-start` |
| `justify-content-end` | `justify-end` |
| `justify-content-center` | `justify-center` |
| `justify-content-between` | `justify-between` |
| `justify-content-around` | `justify-around` |
| `align-items-start` | `items-start` |
| `align-items-end` | `items-end` |
| `align-items-center` | `items-center` |
| `align-items-stretch` | `items-stretch` |
| `p-0` to `p-8` | `p-0` to `p-8` |
| `m-0` to `m-8` | `m-0` to `m-8` |
| `mt-1`, `mr-2`, etc. | `mt-1`, `mr-2`, etc. |
| `w-full` | `w-full` |
| `block` | `block` |
| `gap-1` to `gap-8` | `gap-1` to `gap-8` |
| `grid` | `grid` |
| `col-12`, `col-6`, etc. | `col-span-12`, `col-span-6`, etc. |

#### Example Migration

```html
<!-- ❌ WRONG: Using PrimeFlex -->
<div class="flex justify-content-between align-items-center mb-3">
  <div class="flex gap-2">
    <!-- content -->
  </div>
</div>

<!-- ✅ CORRECT: Using Tailwind CSS -->
<div class="flex justify-between items-center mb-3">
  <div class="flex gap-2">
    <!-- content -->
  </div>
</div>
```

**Important**: If you encounter any PrimeFlex classes in the codebase, replace them immediately with their Tailwind equivalents.

## Data Transfer Objects (DTOs)

### Naming Conventions
- Input DTOs: `Create[Entity]Dto`, `Update[Entity]Dto`
- Response DTOs: `[Entity]ResponseDto`

### Implementation Pattern
```typescript
// Entity
export interface LandingSite {
  id?: number;
  name: string;
  // ...
}

// DTOs
export interface CreateLandingSiteDto {
  name: string;
  // ... (no id)
}

export interface LandingSiteResponseDto {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  // ...
}
```

### Entity Methods
Add `toResponseDto()` method on entities for consistent transformation:

```typescript
class LandingSiteEntity {
  toResponseDto(): LandingSiteResponseDto {
    return {
      id: this.id,
      name: this.name,
      created_at: this.created_at.toISOString(),
      // ...
    };
  }
}
```

## Service Patterns

### HTTP Services
1. Return Observables from all methods
2. Use proper TypeScript generics
3. Handle errors at the service level when appropriate
4. Use environment variables for API URLs

Example:
```typescript
@Injectable({ providedIn: 'root' })
export class LandingSiteService {
  private apiUrl = `${environment.apiUrl}/landing-sites`;

  getAll(): Observable<LandingSiteResponseDto[]> {
    return this.http.get<LandingSiteResponseDto[]>(this.apiUrl);
  }
}
```

## Testing Requirements

### Unit Tests
- Test services with HttpClientTestingModule
- Test component logic, not template details
- Mock external dependencies

### E2E Tests
- Focus on critical user journeys
- Test CRUD operations
- Verify error handling

## Accessibility

### Required Attributes
- All form inputs must have labels
- Buttons must have descriptive text or aria-label
- Tables must have proper headers
- Use semantic HTML elements

### Keyboard Navigation
- All interactive elements must be keyboard accessible
- Tab order should be logical
- Provide skip links for repetitive content

## Performance Guidelines

### Lazy Loading
- Use lazy loading for feature modules
- Implement virtual scrolling for large lists
- Use OnPush change detection where possible

### Bundle Size
- Import only needed PrimeNG modules
- Use tree-shakeable imports
- Monitor bundle size with `nx build --stats-json`

## Code Organization

### Feature Structure
```
features/
├── [feature-name]/
│   ├── components/
│   │   ├── [feature]-list.component.ts
│   │   └── [feature]-form.component.ts
│   ├── services/
│   │   └── [feature].service.ts
│   ├── models/
│   │   ├── [feature].model.ts
│   │   └── [feature].dto.ts
│   └── [feature].component.ts  // Parent wrapper with page-header
```

### Shared Code
- Place reusable components in `libs/shared`
- Place shared models in `libs/shared-models`
- Use Nx workspace aliases (`@snapper/shared`)

## Git Commit Guidelines

### Commit Message Format
```
type(scope): subject

body (optional)

footer (optional)
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc)
- `refactor`: Code refactoring
- `test`: Test additions or changes
- `chore`: Build process or auxiliary tool changes

### Examples
```
feat(landing-sites): add CRUD operations for landing sites

- Implement list view with search and pagination
- Add create/edit/delete functionality
- Include form validation

Closes #123
```

## Environment Configuration

### Development
- Use proxy configuration for API calls
- Keep sensitive data in environment files
- Never commit credentials

### Production
- Use environment-specific builds
- Enable production optimizations
- Implement proper error logging