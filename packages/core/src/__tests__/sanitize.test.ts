import { describe, expect, it } from "vitest";
import {
	escapeScriptContent,
	isSafeUrl,
	normalizeWhitespace,
	sanitizeHtml,
	sanitizeText,
	stripTags,
} from "../sanitize";

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

describe("sanitizeHtml", () => {
	it("removes script tags and content", () => {
		expect(sanitizeHtml('<p>Safe</p><script>alert("xss")</script>')).toBe(
			"<p>Safe</p>",
		);
	});

	it("removes style tags and content", () => {
		expect(sanitizeHtml("<div>Ok</div><style>*{display:none}</style>")).toBe(
			"<div>Ok</div>",
		);
	});

	it("removes iframe tags", () => {
		expect(sanitizeHtml('<p>Content</p><iframe src="evil.com"></iframe>')).toBe(
			"<p>Content</p>",
		);
	});

	it("removes self-closing iframes", () => {
		expect(sanitizeHtml('<p>Ok</p><iframe src="x" />')).toBe("<p>Ok</p>");
	});

	it("removes object tags", () => {
		expect(sanitizeHtml('<object data="x.swf">fallback</object>')).toBe("");
	});

	it("removes embed tags", () => {
		expect(sanitizeHtml('<embed src="x.swf" />')).toBe("");
	});

	it("removes form tags and content", () => {
		expect(
			sanitizeHtml('<form action="/steal"><input name="pw"/></form>'),
		).toBe("");
	});

	it("removes event handler attributes", () => {
		expect(sanitizeHtml('<img src="x.jpg" onerror="alert(1)">')).toBe(
			'<img src="x.jpg">',
		);
	});

	it("removes onclick attributes", () => {
		expect(sanitizeHtml('<a href="/ok" onclick="steal()">Link</a>')).toBe(
			'<a href="/ok">Link</a>',
		);
	});

	it("removes javascript: URLs", () => {
		expect(sanitizeHtml('<a href="javascript:alert(1)">Click</a>')).toBe(
			'<a href="">Click</a>',
		);
	});

	it("preserves safe HTML tags", () => {
		const safe =
			'<h1>Title</h1><p>Para with <strong>bold</strong> and <a href="/link">link</a></p>';
		expect(sanitizeHtml(safe)).toBe(safe);
	});

	it("preserves safe attributes", () => {
		const safe = '<img src="photo.jpg" alt="A photo" class="rounded">';
		expect(sanitizeHtml(safe)).toBe(safe);
	});

	it("handles empty string", () => {
		expect(sanitizeHtml("")).toBe("");
	});

	it("handles plain text", () => {
		expect(sanitizeHtml("Just text")).toBe("Just text");
	});
});

describe("isSafeUrl", () => {
	it("accepts normal URLs", () => {
		expect(isSafeUrl("https://example.com")).toBe(true);
		expect(isSafeUrl("/products/123")).toBe(true);
		expect(isSafeUrl("mailto:user@example.com")).toBe(true);
	});

	it("rejects javascript: URIs", () => {
		expect(isSafeUrl("javascript:alert(1)")).toBe(false);
		expect(isSafeUrl("JAVASCRIPT:alert(1)")).toBe(false);
		expect(isSafeUrl("  javascript:alert(1)")).toBe(false);
	});

	it("rejects data: URIs", () => {
		expect(isSafeUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
	});

	it("rejects vbscript: URIs", () => {
		expect(isSafeUrl("vbscript:msgbox")).toBe(false);
	});

	it("rejects obfuscated javascript: URIs with control chars", () => {
		expect(isSafeUrl("java\tscript:alert(1)")).toBe(false);
		expect(isSafeUrl("java\nscript:alert(1)")).toBe(false);
	});

	it("accepts empty string", () => {
		expect(isSafeUrl("")).toBe(true);
	});
});

describe("escapeScriptContent", () => {
	it("escapes closing script tags", () => {
		expect(escapeScriptContent("</script>")).toBe("<\\/script>");
	});

	it("escapes HTML comments", () => {
		expect(escapeScriptContent("<!--")).toBe("<\\!--");
	});

	it("escapes both patterns in JSON", () => {
		const json = '{"html":"</script>","comment":"<!--test-->"}';
		const escaped = escapeScriptContent(json);
		expect(escaped).not.toContain("</");
		expect(escaped).not.toContain("<!--");
		expect(escaped).toBe('{"html":"<\\/script>","comment":"<\\!--test-->"}');
	});

	it("leaves safe content unchanged", () => {
		const safe = '{"name":"Product","price":9.99}';
		expect(escapeScriptContent(safe)).toBe(safe);
	});

	it("handles empty string", () => {
		expect(escapeScriptContent("")).toBe("");
	});
});
