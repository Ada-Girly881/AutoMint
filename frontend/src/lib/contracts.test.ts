import { parseListing, parseUserProfile, parseBotNFT } from "./contracts";

describe("contracts parse helpers", () => {
  describe("parseListing", () => {
    it("should parse a valid raw marketplace listing map into a MarketplaceListing object", () => {
      const rawData = {
        id: "1",
        seller: "GABC1234567890",
        bot_id: 42,
        price: "1000000000",
        listed_at: 1700000000n,
      };

      const result = parseListing(rawData);

      expect(result).toEqual({
        id: 1n,
        seller: "GABC1234567890",
        bot_id: 42n,
        price: 1000000000n,
        listed_at: 1700000000n,
      });
    });

    it("should handle missing or nullish values gracefully", () => {
      const rawData = {};

      const result = parseListing(rawData);

      expect(result).toEqual({
        id: 0n,
        seller: "",
        bot_id: 0n,
        price: 0n,
        listed_at: 0n,
      });
    });
  });

  describe("parseUserProfile", () => {
    it("should parse raw user profile data correctly", () => {
      const rawData = {
        username: "alice",
        points: "150",
      };

      const result = parseUserProfile(rawData);

      expect(result).toEqual({
        username: "alice",
        points: 150n,
      });
    });
  });

  describe("parseBotNFT", () => {
    it("should parse raw bot NFT data correctly with string tier", () => {
      const rawData = {
        id: 10,
        name: "Bot #10",
        owner: "GXYZ987654321",
        tier: "Gold",
        accrual_rate: "50",
        minted_at: 1690000000,
        last_claim_timestamp: "1690005000",
      };

      const result = parseBotNFT(rawData);

      expect(result).toEqual({
        id: 10n,
        name: "Bot #10",
        owner: "GXYZ987654321",
        tier: "Gold",
        accrual_rate: 50n,
        minted_at: 1690000000,
        last_claim_timestamp: 1690005000n,
      });
    });
  });
});
