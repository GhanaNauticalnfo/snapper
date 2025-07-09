import { validate } from 'class-validator';
import { DeviceInputDto } from './dto/device-input.dto';
import { DeviceActivationDto } from './dto/device-activation.dto';

describe('Device Validation', () => {
  describe('DeviceInputDto', () => {
    let validDevice: DeviceInputDto;

    beforeEach(() => {
      validDevice = {
        vessel_id: 1,
        expires_in_days: 30,
      };
    });

    it('should pass validation with valid data', async () => {
      const dto = Object.assign(new DeviceInputDto(), validDevice);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with only vessel_id', async () => {
      const dto = Object.assign(new DeviceInputDto(), {
        vessel_id: 1,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with only expires_in_days', async () => {
      const dto = Object.assign(new DeviceInputDto(), {
        expires_in_days: 7,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with empty object (all fields optional)', async () => {
      const dto = Object.assign(new DeviceInputDto(), {});
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with negative vessel_id', async () => {
      const dto = Object.assign(new DeviceInputDto(), {
        vessel_id: -1,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('vessel_id');
      expect(errors[0].constraints?.isPositive).toContain('vessel_id must be a positive number');
    });

    it('should fail validation with zero vessel_id', async () => {
      const dto = Object.assign(new DeviceInputDto(), {
        vessel_id: 0,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('vessel_id');
      expect(errors[0].constraints?.isPositive).toContain('vessel_id must be a positive number');
    });

    it('should fail validation with non-number vessel_id', async () => {
      const dto = Object.assign(new DeviceInputDto(), {
        vessel_id: 'abc',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('vessel_id');
      expect(errors[0].constraints?.isNumber).toBeDefined();
    });

    it('should fail validation with expires_in_days less than 1', async () => {
      const dto = Object.assign(new DeviceInputDto(), {
        expires_in_days: 0,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('expires_in_days');
      expect(errors[0].constraints?.min).toContain('expires_in_days must not be less than 1');
    });

    it('should fail validation with expires_in_days greater than 365', async () => {
      const dto = Object.assign(new DeviceInputDto(), {
        expires_in_days: 366,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('expires_in_days');
      expect(errors[0].constraints?.max).toContain('expires_in_days must not be greater than 365');
    });

    it('should pass validation with expires_in_days at boundaries', async () => {
      // Test minimum boundary
      let dto = Object.assign(new DeviceInputDto(), {
        expires_in_days: 1,
      });
      let errors = await validate(dto);
      expect(errors).toHaveLength(0);

      // Test maximum boundary
      dto = Object.assign(new DeviceInputDto(), {
        expires_in_days: 365,
      });
      errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with non-number expires_in_days', async () => {
      const dto = Object.assign(new DeviceInputDto(), {
        expires_in_days: 'thirty',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('expires_in_days');
      expect(errors[0].constraints?.isNumber).toBeDefined();
    });
  });

  describe('DeviceActivationDto', () => {
    let validActivation: DeviceActivationDto;

    beforeEach(() => {
      validActivation = {
        activation_token: 'abc123def456',
      };
    });

    it('should pass validation with valid activation token', async () => {
      const dto = Object.assign(new DeviceActivationDto(), validActivation);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with single character token', async () => {
      const dto = Object.assign(new DeviceActivationDto(), {
        activation_token: 'a',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with 255 character token', async () => {
      const dto = Object.assign(new DeviceActivationDto(), {
        activation_token: 'a'.repeat(255),
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with empty activation token', async () => {
      const dto = Object.assign(new DeviceActivationDto(), {
        activation_token: '',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('activation_token');
      expect(errors[0].constraints?.isNotEmpty).toContain('activation_token should not be empty');
    });

    it('should fail validation with missing activation token', async () => {
      const dto = Object.assign(new DeviceActivationDto(), {});
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('activation_token');
      expect(errors[0].constraints?.isNotEmpty).toContain('activation_token should not be empty');
    });

    it('should fail validation with non-string activation token', async () => {
      const dto = Object.assign(new DeviceActivationDto(), {
        activation_token: 12345,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('activation_token');
      expect(errors[0].constraints?.isString).toContain('activation_token must be a string');
    });

    it('should fail validation with token longer than 255 characters', async () => {
      const dto = Object.assign(new DeviceActivationDto(), {
        activation_token: 'a'.repeat(256),
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('activation_token');
      // Check if any constraint exists for length validation
      const constraints = errors[0].constraints || {};
      const hasLengthConstraint = Object.keys(constraints).some(key => 
        key.toLowerCase().includes('length') || key.toLowerCase().includes('max')
      );
      expect(hasLengthConstraint).toBe(true);
    });

    it('should handle whitespace in activation token', async () => {
      // Whitespace is valid (might be intentional in some token schemes)
      const dto = Object.assign(new DeviceActivationDto(), {
        activation_token: '  token with spaces  ',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle special characters in activation token', async () => {
      const dto = Object.assign(new DeviceActivationDto(), {
        activation_token: 'token-with_special.chars!@#$%',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});