import { SafeMath } from '../safeMath';

describe('SafeMath', () => {
  describe('toWei', () => {
    it('should convert decimals to wei correctly', () => {
      expect(SafeMath.toWei('1')).toBe(1000000000000000000n);
      expect(SafeMath.toWei('0.5')).toBe(500000000000000000n);
      expect(SafeMath.toWei('100')).toBe(100000000000000000000n);
      expect(SafeMath.toWei('0.000000000000000001')).toBe(1n);
    });
    
    it('should handle edge cases', () => {
      expect(SafeMath.toWei('0')).toBe(0n);
      expect(SafeMath.toWei('0.0')).toBe(0n);
      expect(SafeMath.toWei('1000000')).toBe(1000000000000000000000000n);
    });

    it('should handle large numbers', () => {
      expect(SafeMath.toWei('69420')).toBe(69420000000000000000000n);
      expect(SafeMath.toWei('1000000000')).toBe(1000000000000000000000000000n);
    });
  });
  
  describe('fromWei', () => {
    it('should convert wei to decimals correctly', () => {
      expect(SafeMath.fromWei(1000000000000000000n)).toBe('1.00');
      expect(SafeMath.fromWei(500000000000000000n)).toBe('0.50');
    });

    it('should handle zero decimals', () => {
      expect(SafeMath.fromWei(1000000000000000000n, 0)).toBe('1');
      expect(SafeMath.fromWei(69420000000000000000000n, 0)).toBe('69420');
    });

    it('should handle custom decimals', () => {
      expect(SafeMath.fromWei(1500000000000000000n, 4)).toBe('1.5000');
    });
  });
  
  describe('add', () => {
    it('should add values correctly', () => {
      const a = SafeMath.toWei('1');
      const b = SafeMath.toWei('2');
      expect(SafeMath.add(a, b)).toBe(SafeMath.toWei('3'));
    });
    
    it('should handle large numbers', () => {
      const a = SafeMath.toWei('1000000');
      const b = SafeMath.toWei('2000000');
      expect(SafeMath.add(a, b)).toBe(SafeMath.toWei('3000000'));
    });
  });
  
  describe('sub', () => {
    it('should subtract values correctly', () => {
      const a = SafeMath.toWei('5');
      const b = SafeMath.toWei('3');
      expect(SafeMath.sub(a, b)).toBe(SafeMath.toWei('2'));
    });
    
    it('should throw on negative result', () => {
      const a = SafeMath.toWei('1');
      const b = SafeMath.toWei('2');
      expect(() => SafeMath.sub(a, b)).toThrow();
    });

    it('should handle equal values', () => {
      const a = SafeMath.toWei('100');
      const b = SafeMath.toWei('100');
      expect(SafeMath.sub(a, b)).toBe(0n);
    });
  });
  
  describe('mul', () => {
    it('should multiply wei values correctly', () => {
      const a = SafeMath.toWei('2');
      const b = SafeMath.toWei('3');
      expect(SafeMath.mul(a, b)).toBe(SafeMath.toWei('6'));
    });

    it('should handle fractional multiplication', () => {
      const a = SafeMath.toWei('10');
      const b = SafeMath.toWei('0.5');
      expect(SafeMath.mul(a, b)).toBe(SafeMath.toWei('5'));
    });
  });
  
  describe('div', () => {
    it('should divide values correctly', () => {
      const a = SafeMath.toWei('10');
      const b = SafeMath.toWei('2');
      expect(SafeMath.div(a, b)).toBe(SafeMath.toWei('5'));
    });
    
    it('should return 0 on division by zero', () => {
      const a = SafeMath.toWei('10');
      expect(SafeMath.div(a, 0n)).toBe(0n);
    });

    it('should handle fractional results', () => {
      const a = SafeMath.toWei('1');
      const b = SafeMath.toWei('2');
      expect(SafeMath.div(a, b)).toBe(SafeMath.toWei('0.5'));
    });
  });
  
  describe('mulPercent', () => {
    it('should calculate percentages correctly', () => {
      const amount = SafeMath.toWei('100');
      expect(SafeMath.mulPercent(amount, 10)).toBe(SafeMath.toWei('10'));
      expect(SafeMath.mulPercent(amount, 1)).toBe(SafeMath.toWei('1'));
      expect(SafeMath.mulPercent(amount, 0.5)).toBe(SafeMath.toWei('0.5'));
    });
    
    it('should handle edge cases', () => {
      const amount = SafeMath.toWei('1000');
      expect(SafeMath.mulPercent(amount, 0)).toBe(0n);
      expect(SafeMath.mulPercent(amount, 100)).toBe(amount);
    });

    it('should handle treasury splits', () => {
      const mintRevenue = SafeMath.toWei('69420');
      const treasuryShare = SafeMath.mulPercent(mintRevenue, 51);
      expect(Number(SafeMath.fromWei(treasuryShare, 0))).toBeCloseTo(35404, 0);
    });
  });

  describe('comparison operators', () => {
    it('gte should work correctly', () => {
      expect(SafeMath.gte(SafeMath.toWei('10'), SafeMath.toWei('5'))).toBe(true);
      expect(SafeMath.gte(SafeMath.toWei('5'), SafeMath.toWei('5'))).toBe(true);
      expect(SafeMath.gte(SafeMath.toWei('3'), SafeMath.toWei('5'))).toBe(false);
    });

    it('lte should work correctly', () => {
      expect(SafeMath.lte(SafeMath.toWei('5'), SafeMath.toWei('10'))).toBe(true);
      expect(SafeMath.lte(SafeMath.toWei('5'), SafeMath.toWei('5'))).toBe(true);
      expect(SafeMath.lte(SafeMath.toWei('10'), SafeMath.toWei('5'))).toBe(false);
    });

    it('eq should work correctly', () => {
      expect(SafeMath.eq(SafeMath.toWei('100'), SafeMath.toWei('100'))).toBe(true);
      expect(SafeMath.eq(SafeMath.toWei('100'), SafeMath.toWei('99'))).toBe(false);
    });
  });

  describe('parseInput', () => {
    it('should parse clean numbers', () => {
      expect(SafeMath.parseInput('100')).toBe(SafeMath.toWei('100'));
      expect(SafeMath.parseInput('69420')).toBe(SafeMath.toWei('69420'));
    });

    it('should handle commas', () => {
      expect(SafeMath.parseInput('69,420')).toBe(SafeMath.toWei('69420'));
      expect(SafeMath.parseInput('1,000,000')).toBe(SafeMath.toWei('1000000'));
    });

    it('should reject invalid input', () => {
      expect(SafeMath.parseInput('abc')).toBe(null);
      expect(SafeMath.parseInput('-100')).toBe(null);
    });
  });

  describe('validate', () => {
    it('should accept valid amounts', () => {
      expect(SafeMath.validate(SafeMath.toWei('1000')).valid).toBe(true);
      expect(SafeMath.validate(SafeMath.toWei('69420')).valid).toBe(true);
    });

    it('should reject negative amounts', () => {
      expect(SafeMath.validate(-1n).valid).toBe(false);
    });

    it('should reject amounts exceeding maximum', () => {
      const tooLarge = SafeMath.toWei('2000000000');
      expect(SafeMath.validate(tooLarge).valid).toBe(false);
    });
  });
});
