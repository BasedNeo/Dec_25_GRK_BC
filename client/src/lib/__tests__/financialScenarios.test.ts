import { SafeMath } from '../safeMath';
import { 
  MINT_SPLIT, 
  ROYALTY_SPLIT,
  PLATFORM_FEE_PERCENT 
} from '../constants';

const MINT_PRICE = 69420;

describe('Financial Scenarios', () => {
  describe('Minting', () => {
    it('should calculate single mint cost correctly', () => {
      const mintPrice = SafeMath.toWei(MINT_PRICE.toString());
      expect(SafeMath.fromWei(mintPrice, 0)).toBe(MINT_PRICE.toString());
    });
    
    it('should calculate multiple mint cost correctly', () => {
      const quantity = 5;
      const singlePrice = SafeMath.toWei(MINT_PRICE.toString());
      const totalCost = singlePrice * BigInt(quantity);
      
      const expected = SafeMath.toWei((MINT_PRICE * quantity).toString());
      expect(totalCost).toBe(expected);
    });
    
    it('should verify user can afford mints', () => {
      const userBalance = SafeMath.toWei('1000000');
      const quantity = 3;
      const singlePrice = SafeMath.toWei(MINT_PRICE.toString());
      const totalCost = singlePrice * BigInt(quantity);
      
      expect(SafeMath.gte(userBalance, totalCost)).toBe(true);
    });
    
    it('should detect insufficient balance', () => {
      const userBalance = SafeMath.toWei('50000');
      const singlePrice = SafeMath.toWei(MINT_PRICE.toString());
      
      expect(SafeMath.gte(userBalance, singlePrice)).toBe(false);
    });

    it('should calculate max affordable quantity', () => {
      const userBalance = SafeMath.toWei('200000');
      const singlePrice = SafeMath.toWei(MINT_PRICE.toString());
      const maxQuantity = SafeMath.div(userBalance, singlePrice);
      
      expect(Number(SafeMath.fromWei(maxQuantity, 0))).toBe(2);
    });
  });
  
  describe('Marketplace Sales', () => {
    it('should calculate platform fee correctly (1%)', () => {
      const salePrice = SafeMath.toWei('100');
      const platformFee = SafeMath.mulPercent(salePrice, PLATFORM_FEE_PERCENT);
      
      expect(SafeMath.fromWei(platformFee, 0)).toBe('1');
    });
    
    it('should calculate royalty fee correctly (10%)', () => {
      const salePrice = SafeMath.toWei('100');
      const royaltyFee = SafeMath.mulPercent(salePrice, ROYALTY_SPLIT.TOTAL_ROYALTY_PERCENT);
      
      expect(SafeMath.fromWei(royaltyFee, 0)).toBe('10');
    });
    
    it('should calculate seller proceeds correctly', () => {
      const salePrice = SafeMath.toWei('100');
      const platformFee = SafeMath.mulPercent(salePrice, PLATFORM_FEE_PERCENT);
      const royaltyFee = SafeMath.mulPercent(salePrice, ROYALTY_SPLIT.TOTAL_ROYALTY_PERCENT);
      
      const totalFees = SafeMath.add(platformFee, royaltyFee);
      const sellerProceeds = SafeMath.sub(salePrice, totalFees);
      
      expect(SafeMath.fromWei(sellerProceeds, 0)).toBe('89');
    });
    
    it('should verify total equals 100%', () => {
      const salePrice = SafeMath.toWei('100');
      const platformFee = SafeMath.mulPercent(salePrice, PLATFORM_FEE_PERCENT);
      const royaltyFee = SafeMath.mulPercent(salePrice, ROYALTY_SPLIT.TOTAL_ROYALTY_PERCENT);
      const sellerProceeds = SafeMath.sub(salePrice, SafeMath.add(platformFee, royaltyFee));
      
      const total = SafeMath.add(SafeMath.add(platformFee, royaltyFee), sellerProceeds);
      expect(total).toBe(salePrice);
    });
  });
  
  describe('Revenue Splits', () => {
    it('should split mint revenue correctly', () => {
      const mintRevenue = SafeMath.toWei('69420');
      
      const treasuryShare = SafeMath.mulPercent(mintRevenue, MINT_SPLIT.TREASURY_PERCENT);
      const creatorShare = SafeMath.mulPercent(mintRevenue, MINT_SPLIT.CREATOR_PERCENT);
      
      expect(Number(SafeMath.fromWei(treasuryShare, 0))).toBeCloseTo(69420 * 0.51, -1);
      expect(Number(SafeMath.fromWei(creatorShare, 0))).toBeCloseTo(69420 * 0.49, -1);
    });
    
    it('should split royalty revenue correctly', () => {
      const salePrice = SafeMath.toWei('100');
      const royaltyRevenue = SafeMath.mulPercent(salePrice, ROYALTY_SPLIT.TOTAL_ROYALTY_PERCENT);
      
      const treasuryShare = SafeMath.mulPercent(royaltyRevenue, 20);
      const creatorShare = SafeMath.mulPercent(royaltyRevenue, 40);
      const royaltyWalletShare = SafeMath.mulPercent(royaltyRevenue, 40);
      
      expect(SafeMath.fromWei(treasuryShare, 0)).toBe('2');
      expect(SafeMath.fromWei(creatorShare, 0)).toBe('4');
      expect(SafeMath.fromWei(royaltyWalletShare, 0)).toBe('4');
      
      const total = SafeMath.add(SafeMath.add(treasuryShare, creatorShare), royaltyWalletShare);
      expect(total).toBe(royaltyRevenue);
    });

    it('should verify 51/49 mint split adds to 100%', () => {
      expect(MINT_SPLIT.TREASURY_PERCENT + MINT_SPLIT.CREATOR_PERCENT).toBe(100);
    });

    it('should verify royalty split adds to 100%', () => {
      const total = ROYALTY_SPLIT.TREASURY_PERCENT + 
                    ROYALTY_SPLIT.ROYALTY_WALLET_PERCENT + 
                    ROYALTY_SPLIT.CREATOR_PERCENT;
      expect(total).toBe(10);
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle dust amounts', () => {
      const dustAmount = 1n;
      const fee = SafeMath.mulPercent(dustAmount, 1);
      expect(fee).toBe(0n);
    });
    
    it('should handle maximum supply calculations', () => {
      const maxSupply = 3732n;
      const currentSupply = 3731n;
      const remaining = maxSupply - currentSupply;
      expect(remaining).toBe(1n);
    });
    
    it('should prevent overflow in large calculations', () => {
      const largeAmount = SafeMath.toWei('100000000');
      const result = SafeMath.mul(largeAmount, SafeMath.toWei('2'));
      expect(result).toBe(SafeMath.toWei('200000000'));
    });

    it('should handle minimum listing price', () => {
      const minPrice = SafeMath.toWei('1');
      const isValid = SafeMath.gte(minPrice, SafeMath.toWei('1'));
      expect(isValid).toBe(true);
    });

    it('should handle minimum offer price', () => {
      const minOffer = SafeMath.toWei('1000');
      const isValid = SafeMath.gte(minOffer, SafeMath.toWei('1000'));
      expect(isValid).toBe(true);
    });
  });

  describe('Gas Safety', () => {
    it('should leave margin for gas costs', () => {
      const balance = SafeMath.toWei('69420');
      const cost = SafeMath.toWei('69420');
      const gasBuffer = SafeMath.toWei('100');
      
      const hasMargin = SafeMath.gte(balance, SafeMath.add(cost, gasBuffer));
      expect(hasMargin).toBe(false);
    });

    it('should detect close balance situations', () => {
      const balance = SafeMath.toWei('70000');
      const cost = SafeMath.toWei('69420');
      const gasEstimate = SafeMath.toWei('100');
      
      const margin = SafeMath.sub(balance, cost);
      const isSafe = SafeMath.gte(margin, gasEstimate);
      expect(isSafe).toBe(true);
    });
  });
});
