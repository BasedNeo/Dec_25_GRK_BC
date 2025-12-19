import { db } from "../db";
import { listings, collections, collectionActivity, searchHistory } from "@shared/schema";
import { eq, and, or, desc, asc, sql, gte, lte, like, ilike } from "drizzle-orm";

export interface SearchFilters {
  query?: string;
  collectionAddress?: string;
  minPrice?: string;
  maxPrice?: string;
  rarity?: string[];
  traits?: Record<string, string[]>;
  sortBy?: 'price_asc' | 'price_desc' | 'recent' | 'oldest';
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface SearchResult {
  listings: any[];
  total: number;
  page: number;
  totalPages: number;
}

export interface TrendingCollection {
  contractAddress: string;
  name: string;
  thumbnailImage: string | null;
  floorPrice: string | null;
  volumeTraded: string | null;
  volume24h: string;
  percentChange: number;
  salesCount: number;
}

export class SearchService {
  async searchListings(filters: SearchFilters): Promise<SearchResult> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const offset = (page - 1) * limit;

    let conditions: any[] = [];
    
    if (filters.isActive !== undefined) {
      conditions.push(eq(listings.isActive, filters.isActive));
    } else {
      conditions.push(eq(listings.isActive, true));
    }

    if (filters.collectionAddress) {
      conditions.push(eq(listings.collectionAddress, filters.collectionAddress.toLowerCase()));
    }

    if (filters.minPrice) {
      conditions.push(sql`CAST(${listings.price} AS DECIMAL) >= ${parseFloat(filters.minPrice)}`);
    }

    if (filters.maxPrice) {
      conditions.push(sql`CAST(${listings.price} AS DECIMAL) <= ${parseFloat(filters.maxPrice)}`);
    }

    if (filters.rarity && filters.rarity.length > 0) {
      conditions.push(sql`${listings.rarity} = ANY(${filters.rarity})`);
    }

    if (filters.query) {
      const searchTerm = `%${filters.query.toLowerCase()}%`;
      conditions.push(
        or(
          sql`LOWER(${listings.metadata}) LIKE ${searchTerm}`,
          sql`CAST(${listings.tokenId} AS TEXT) LIKE ${searchTerm}`
        )
      );
    }

    let orderBy: any = desc(listings.listedAt);
    if (filters.sortBy === 'price_asc') {
      orderBy = sql`CAST(${listings.price} AS DECIMAL) ASC`;
    } else if (filters.sortBy === 'price_desc') {
      orderBy = sql`CAST(${listings.price} AS DECIMAL) DESC`;
    } else if (filters.sortBy === 'oldest') {
      orderBy = asc(listings.listedAt);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [results, countResult] = await Promise.all([
      db.select()
        .from(listings)
        .where(whereClause)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` })
        .from(listings)
        .where(whereClause)
    ]);

    const total = countResult[0]?.count || 0;

    return {
      listings: results,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getTrendingCollections(hours: number = 24, limit: number = 10): Promise<TrendingCollection[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const recentActivity = await db
      .select({
        collectionAddress: collectionActivity.collectionAddress,
        salesCount: sql<number>`count(*)::int`,
        volume24h: sql<string>`COALESCE(SUM(CAST(${collectionActivity.price} AS DECIMAL)), 0)::text`
      })
      .from(collectionActivity)
      .where(and(
        eq(collectionActivity.eventType, 'sale'),
        gte(collectionActivity.timestamp, since)
      ))
      .groupBy(collectionActivity.collectionAddress)
      .orderBy(sql`SUM(CAST(${collectionActivity.price} AS DECIMAL)) DESC`)
      .limit(limit);

    if (recentActivity.length === 0) {
      const allCollections = await db
        .select()
        .from(collections)
        .where(eq(collections.isActive, true))
        .orderBy(sql`CAST(${collections.volumeTraded} AS DECIMAL) DESC`)
        .limit(limit);

      return allCollections.map(c => ({
        contractAddress: c.contractAddress,
        name: c.name,
        thumbnailImage: c.thumbnailImage,
        floorPrice: c.floorPrice,
        volumeTraded: c.volumeTraded,
        volume24h: '0',
        percentChange: 0,
        salesCount: 0
      }));
    }

    const collectionAddresses = recentActivity.map(a => a.collectionAddress);
    const collectionDetails = await db
      .select()
      .from(collections)
      .where(sql`${collections.contractAddress} = ANY(${collectionAddresses})`);

    const detailsMap = new Map(collectionDetails.map(c => [c.contractAddress, c]));

    return recentActivity.map(activity => {
      const details = detailsMap.get(activity.collectionAddress);
      return {
        contractAddress: activity.collectionAddress,
        name: details?.name || 'Unknown Collection',
        thumbnailImage: details?.thumbnailImage || null,
        floorPrice: details?.floorPrice || null,
        volumeTraded: details?.volumeTraded || null,
        volume24h: activity.volume24h,
        percentChange: 0,
        salesCount: activity.salesCount
      };
    });
  }

  async searchCollections(query: string): Promise<any[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    
    return db
      .select()
      .from(collections)
      .where(and(
        eq(collections.isActive, true),
        or(
          ilike(collections.name, searchTerm),
          ilike(collections.symbol, searchTerm)
        )
      ))
      .orderBy(sql`CAST(${collections.volumeTraded} AS DECIMAL) DESC`)
      .limit(10);
  }

  async getCollectionStats(contractAddress: string) {
    const [collection] = await db
      .select()
      .from(collections)
      .where(eq(collections.contractAddress, contractAddress.toLowerCase()));

    if (!collection) return null;

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [stats24h, stats7d, activeListingsCount] = await Promise.all([
      db.select({
        sales: sql<number>`count(*)::int`,
        volume: sql<string>`COALESCE(SUM(CAST(${collectionActivity.price} AS DECIMAL)), 0)::text`
      })
      .from(collectionActivity)
      .where(and(
        eq(collectionActivity.collectionAddress, contractAddress.toLowerCase()),
        eq(collectionActivity.eventType, 'sale'),
        gte(collectionActivity.timestamp, oneDayAgo)
      )),
      
      db.select({
        sales: sql<number>`count(*)::int`,
        volume: sql<string>`COALESCE(SUM(CAST(${collectionActivity.price} AS DECIMAL)), 0)::text`
      })
      .from(collectionActivity)
      .where(and(
        eq(collectionActivity.collectionAddress, contractAddress.toLowerCase()),
        eq(collectionActivity.eventType, 'sale'),
        gte(collectionActivity.timestamp, oneWeekAgo)
      )),
      
      db.select({ count: sql<number>`count(*)::int` })
        .from(listings)
        .where(and(
          eq(listings.collectionAddress, contractAddress.toLowerCase()),
          eq(listings.isActive, true)
        ))
    ]);

    return {
      ...collection,
      volume24h: stats24h[0]?.volume || '0',
      sales24h: stats24h[0]?.sales || 0,
      volume7d: stats7d[0]?.volume || '0',
      sales7d: stats7d[0]?.sales || 0,
      activeListings: activeListingsCount[0]?.count || 0
    };
  }

  async recordSearch(walletAddress: string | null, query: string, resultCount: number) {
    await db.insert(searchHistory).values({
      walletAddress,
      query,
      resultCount
    });
  }

  async getPopularSearches(limit: number = 10) {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    return db
      .select({
        query: searchHistory.query,
        count: sql<number>`count(*)::int`
      })
      .from(searchHistory)
      .where(gte(searchHistory.searchedAt, oneWeekAgo))
      .groupBy(searchHistory.query)
      .orderBy(sql`count(*) DESC`)
      .limit(limit);
  }

  async syncListingFromChain(
    tokenId: number,
    collectionAddress: string,
    sellerAddress: string,
    price: string,
    metadata?: string,
    rarity?: string,
    traits?: string
  ) {
    const existing = await db
      .select()
      .from(listings)
      .where(and(
        eq(listings.tokenId, tokenId),
        eq(listings.collectionAddress, collectionAddress.toLowerCase()),
        eq(listings.isActive, true)
      ));

    if (existing.length > 0) {
      await db
        .update(listings)
        .set({ 
          price, 
          sellerAddress: sellerAddress.toLowerCase(),
          metadata,
          rarity,
          traits
        })
        .where(eq(listings.id, existing[0].id));
    } else {
      await db.insert(listings).values({
        tokenId,
        collectionAddress: collectionAddress.toLowerCase(),
        sellerAddress: sellerAddress.toLowerCase(),
        price,
        isActive: true,
        metadata,
        rarity,
        traits
      });
    }
  }

  async cancelListing(tokenId: number, collectionAddress: string) {
    await db
      .update(listings)
      .set({ isActive: false })
      .where(and(
        eq(listings.tokenId, tokenId),
        eq(listings.collectionAddress, collectionAddress.toLowerCase()),
        eq(listings.isActive, true)
      ));
  }

  async recordActivity(
    collectionAddress: string,
    eventType: 'sale' | 'listing' | 'transfer' | 'offer',
    tokenId: number | null,
    fromAddress: string | null,
    toAddress: string | null,
    price: string | null,
    transactionHash: string | null,
    blockNumber: number | null
  ) {
    await db.insert(collectionActivity).values({
      collectionAddress: collectionAddress.toLowerCase(),
      eventType,
      tokenId,
      fromAddress: fromAddress?.toLowerCase() || null,
      toAddress: toAddress?.toLowerCase() || null,
      price,
      transactionHash,
      blockNumber
    });
  }
}

export const searchService = new SearchService();
