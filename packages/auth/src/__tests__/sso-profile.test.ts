import { describe, expect, it } from "vitest";
import { mapSsoProfileToUser } from "../index";

describe("mapSsoProfileToUser", () => {
	it("grants admin when profile role is admin", () => {
		const result = mapSsoProfileToUser({
			name: "Alice",
			email: "alice@example.com",
			role: "admin",
		});
		expect(result.role).toBe("admin");
		expect(result.name).toBe("Alice");
		expect(result.email).toBe("alice@example.com");
	});

	it("grants admin when scope string includes store:admin", () => {
		const result = mapSsoProfileToUser({
			name: "Bob",
			email: "bob@example.com",
			scope: "openid profile email store:admin",
		});
		expect(result.role).toBe("admin");
	});

	it("grants admin when scope array includes store:admin", () => {
		const result = mapSsoProfileToUser({
			name: "Charlie",
			email: "charlie@example.com",
			scope: ["openid", "profile", "store:admin"],
		});
		expect(result.role).toBe("admin");
	});

	it("assigns user role when no admin indicators present", () => {
		const result = mapSsoProfileToUser({
			name: "Dave",
			email: "dave@example.com",
			scope: "openid profile email",
			role: "member",
		});
		expect(result.role).toBe("user");
	});

	it("assigns user role when scope is missing entirely", () => {
		const result = mapSsoProfileToUser({
			name: "Eve",
			email: "eve@example.com",
		});
		expect(result.role).toBe("user");
	});

	it("includes image when profile has picture", () => {
		const result = mapSsoProfileToUser({
			name: "Frank",
			email: "frank@example.com",
			picture: "https://example.com/avatar.jpg",
		});
		expect(result.image).toBe("https://example.com/avatar.jpg");
	});

	it("omits image when profile has no picture", () => {
		const result = mapSsoProfileToUser({
			name: "Grace",
			email: "grace@example.com",
		});
		expect("image" in result).toBe(false);
	});

	it("handles empty scope string — no admin", () => {
		const result = mapSsoProfileToUser({
			name: "Hank",
			email: "hank@example.com",
			scope: "",
		});
		expect(result.role).toBe("user");
	});

	it("handles empty scope array — no admin", () => {
		const result = mapSsoProfileToUser({
			name: "Iris",
			email: "iris@example.com",
			scope: [],
		});
		expect(result.role).toBe("user");
	});

	it("grants admin from role even without store:admin scope", () => {
		const result = mapSsoProfileToUser({
			name: "Jack",
			email: "jack@example.com",
			role: "admin",
			scope: "openid profile",
		});
		expect(result.role).toBe("admin");
	});

	it("grants admin from scope even without admin role", () => {
		const result = mapSsoProfileToUser({
			name: "Kate",
			email: "kate@example.com",
			role: "user",
			scope: "openid store:admin",
		});
		expect(result.role).toBe("admin");
	});

	it("handles non-string and non-array scope as no scopes", () => {
		const result = mapSsoProfileToUser({
			name: "Leo",
			email: "leo@example.com",
			scope: 42,
		});
		expect(result.role).toBe("user");
	});
});
