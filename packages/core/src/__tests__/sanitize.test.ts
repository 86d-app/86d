import { describe, expect, it } from "vitest";
import { normalizeWhitespace, sanitizeText, stripTags } from "../sanitize";

describe("stripTags", () => {
	it("removes simple HTML tags", () => {
		expect(stripTags("<b>bold</b> text")).toBe("bold text");
	});

	it("removes self-closing tags", () => {
		expect(stripTags("hello<br/>world")).toBe("helloworld");
	});

	it("removes script content entirely", () => {
		expect(stripTags('before<script>alert("xss")</script>after')).toBe(
			"beforeafter",
		);
	});

	it("removes style content entirely", () => {
		expect(stripTags("text<style>body{color:red}</style>more")).toBe(
			"textmore",
		);
	});

	it("handles nested tags", () => {
		expect(stripTags("<div><span>inner</span></div>")).toBe("inner");
	});

	it("returns plain text unchanged", () => {
		expect(stripTags("no tags here")).toBe("no tags here");
	});

	it("handles empty string", () => {
		expect(stripTags("")).toBe("");
	});

	it("handles multiple script tags", () => {
		expect(
			stripTags('<script>a</script>ok<script type="module">b</script>'),
		).toBe("ok");
	});
});

describe("normalizeWhitespace", () => {
	it("collapses multiple spaces", () => {
		expect(normalizeWhitespace("hello    world")).toBe("hello world");
	});

	it("collapses tabs and newlines", () => {
		expect(normalizeWhitespace("hello\t\n\tworld")).toBe("hello world");
	});

	it("trims leading and trailing whitespace", () => {
		expect(normalizeWhitespace("  hello  ")).toBe("hello");
	});

	it("handles empty string", () => {
		expect(normalizeWhitespace("")).toBe("");
	});

	it("handles whitespace-only string", () => {
		expect(normalizeWhitespace("   \t\n  ")).toBe("");
	});
});

describe("sanitizeText", () => {
	it("strips tags and normalizes whitespace", () => {
		expect(sanitizeText("<b>Hello</b>   <i>World</i>")).toBe("Hello World");
	});

	it("handles script injection attempt", () => {
		expect(sanitizeText('<script>alert("xss")</script>Clean text')).toBe(
			"Clean text",
		);
	});

	it("handles normal text without modification", () => {
		expect(sanitizeText("Normal product name")).toBe("Normal product name");
	});

	it("handles multiline input with tags", () => {
		expect(sanitizeText("<p>Line one</p>\n<p>Line two</p>")).toBe(
			"Line one Line two",
		);
	});

	it("preserves special characters that are not tags", () => {
		expect(sanitizeText("Price: $10 & 20% off")).toBe("Price: $10 & 20% off");
	});

	it("handles empty string", () => {
		expect(sanitizeText("")).toBe("");
	});
});
