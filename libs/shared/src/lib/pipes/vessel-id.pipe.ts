import { Pipe, PipeTransform } from '@angular/core';
import { formatVesselId } from '../utils/vessel-id.util';

/**
 * Angular pipe for formatting vessel IDs in Ghana Maritime format
 * Usage: {{ vessel.id | vesselId }}
 * Output: GH-0001, GH-0123, etc.
 */
@Pipe({
  name: 'vesselId',
  standalone: true
})
export class VesselIdPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value == null) {
      return 'GH-0000';
    }
    return formatVesselId(value);
  }
}