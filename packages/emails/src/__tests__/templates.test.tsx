import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BaseEmail } from "../templates/base";
import LowStockAlertEmail from "../templates/low-stock-alert";
import OrderConfirmationEmail from "../templates/order-confirmation";
import RefundProcessedEmail from "../templates/refund-processed";
import ShippingNotificationEmail from "../templates/shipping-notification";
import WelcomeEmail from "../templates/welcome";

function render(element: React.ReactElement): string {
	return renderToStaticMarkup(element);
}

describe("BaseEmail", () => {
	it("renders children", () => {
		const html = render(
			<BaseEmail>
				<p>Hello</p>
			</BaseEmail>,
		);
		expect(html).toContain("<p>Hello</p>");
	});

	it("renders preview text when provided", () => {
		const html = render(
			<BaseEmail preview="Check this out">
				<p>Content</p>
			</BaseEmail>,
		);
		expect(html).toContain("Check this out");
	});

	it("renders store name in header and footer", () => {
		const html = render(
			<BaseEmail storeName="Cool Store">
				<p>Content</p>
			</BaseEmail>,
		);
		expect(html).toContain("Cool Store");
		expect(html).toContain("Powered by 86d");
	});

	it("shows generic footer when no store name", () => {
		const html = render(
			<BaseEmail>
				<p>Content</p>
			</BaseEmail>,
		);
		expect(html).toContain("Powered by 86d");
	});
});

describe("WelcomeEmail", () => {
	it("renders with store name", () => {
		const html = render(<WelcomeEmail storeName="My Shop" />);
		expect(html).toContain("Welcome");
		expect(html).toContain("My Shop");
	});

	it("falls back to 'our store' without store name", () => {
		const html = render(<WelcomeEmail />);
		expect(html).toContain("our store");
	});
});

describe("OrderConfirmationEmail", () => {
	const baseProps = {
		orderNumber: "ORD-001",
		customerName: "Alice",
		items: [
			{ name: "Widget", quantity: 2, price: 1500 },
			{ name: "Gadget", quantity: 1, price: 3000 },
		],
		subtotal: 6000,
		taxAmount: 480,
		shippingAmount: 500,
		discountAmount: 0,
		total: 6980,
		currency: "USD",
	};

	it("renders order number and customer name", () => {
		const html = render(<OrderConfirmationEmail {...baseProps} />);
		expect(html).toContain("ORD-001");
		expect(html).toContain("Alice");
	});

	it("renders item names and quantities", () => {
		const html = render(<OrderConfirmationEmail {...baseProps} />);
		expect(html).toContain("Widget");
		expect(html).toContain("x2");
		expect(html).toContain("Gadget");
	});

	it("renders formatted total", () => {
		const html = render(<OrderConfirmationEmail {...baseProps} />);
		expect(html).toContain("$69.80");
	});

	it("shows shipping address when provided", () => {
		const html = render(
			<OrderConfirmationEmail
				{...baseProps}
				shippingAddress={{
					firstName: "Alice",
					lastName: "Smith",
					line1: "123 Main St",
					city: "Springfield",
					state: "IL",
					postalCode: "62701",
					country: "US",
				}}
			/>,
		);
		expect(html).toContain("123 Main St");
		expect(html).toContain("Springfield");
		expect(html).toContain("Shipping To");
	});

	it("hides shipping address when not provided", () => {
		const html = render(<OrderConfirmationEmail {...baseProps} />);
		expect(html).not.toContain("Shipping To");
	});

	it("shows discount row when discount is positive", () => {
		const html = render(
			<OrderConfirmationEmail {...baseProps} discountAmount={1000} />,
		);
		expect(html).toContain("Discount");
	});

	it("hides discount row when discount is zero", () => {
		const html = render(<OrderConfirmationEmail {...baseProps} />);
		expect(html).not.toContain("Discount");
	});

	it("renders address line2 when present", () => {
		const html = render(
			<OrderConfirmationEmail
				{...baseProps}
				shippingAddress={{
					firstName: "Bob",
					lastName: "Jones",
					line1: "456 Oak Ave",
					line2: "Apt 2B",
					city: "Portland",
					state: "OR",
					postalCode: "97201",
					country: "US",
				}}
			/>,
		);
		expect(html).toContain("Apt 2B");
	});
});

describe("ShippingNotificationEmail", () => {
	it("renders order number and customer name", () => {
		const html = render(
			<ShippingNotificationEmail orderNumber="ORD-002" customerName="Bob" />,
		);
		expect(html).toContain("ORD-002");
		expect(html).toContain("Bob");
		expect(html).toContain("Your Order Has Shipped");
	});

	it("shows tracking info when provided", () => {
		const html = render(
			<ShippingNotificationEmail
				orderNumber="ORD-002"
				customerName="Bob"
				trackingNumber="1Z999AA10123456784"
				carrier="UPS"
				trackingUrl="https://track.example.com/123"
			/>,
		);
		expect(html).toContain("1Z999AA10123456784");
		expect(html).toContain("UPS");
		expect(html).toContain("Track Your Package");
	});

	it("hides tracking section when no tracking info", () => {
		const html = render(
			<ShippingNotificationEmail orderNumber="ORD-002" customerName="Bob" />,
		);
		expect(html).not.toContain("Tracking Number");
		expect(html).not.toContain("Track Your Package");
	});
});

describe("RefundProcessedEmail", () => {
	it("renders refund amount and order number", () => {
		const html = render(
			<RefundProcessedEmail
				orderNumber="ORD-003"
				customerName="Charlie"
				refundAmount={2500}
				currency="USD"
			/>,
		);
		expect(html).toContain("$25.00");
		expect(html).toContain("ORD-003");
		expect(html).toContain("Refund Processed");
	});

	it("shows reason when provided", () => {
		const html = render(
			<RefundProcessedEmail
				orderNumber="ORD-003"
				customerName="Charlie"
				refundAmount={2500}
				currency="USD"
				reason="Product defective"
			/>,
		);
		expect(html).toContain("Reason");
		expect(html).toContain("Product defective");
	});

	it("shows refunded items when provided", () => {
		const html = render(
			<RefundProcessedEmail
				orderNumber="ORD-003"
				customerName="Charlie"
				refundAmount={3000}
				currency="USD"
				items={[{ name: "Widget", quantity: 1, price: 3000 }]}
			/>,
		);
		expect(html).toContain("Widget");
		expect(html).toContain("Refunded Items");
	});

	it("hides items section when no items", () => {
		const html = render(
			<RefundProcessedEmail
				orderNumber="ORD-003"
				customerName="Charlie"
				refundAmount={1000}
				currency="USD"
			/>,
		);
		expect(html).not.toContain("Refunded Items");
	});
});

describe("LowStockAlertEmail", () => {
	it("renders product list with stock levels", () => {
		const html = render(
			<LowStockAlertEmail
				items={[
					{
						productId: "p1",
						productName: "Red Widget",
						quantity: 10,
						reserved: 3,
						available: 2,
						lowStockThreshold: 5,
					},
				]}
			/>,
		);
		expect(html).toContain("Red Widget");
		expect(html).toContain("Low Stock Alert");
	});

	it("shows 'Stock Alert' heading when any item is out of stock", () => {
		const html = render(
			<LowStockAlertEmail
				items={[
					{
						productId: "p1",
						productName: "Gone Widget",
						quantity: 0,
						reserved: 0,
						available: 0,
						lowStockThreshold: 5,
					},
				]}
			/>,
		);
		expect(html).toContain("Stock Alert");
	});

	it("uses singular wording for one product", () => {
		const html = render(
			<LowStockAlertEmail
				items={[
					{
						productId: "p1",
						productName: "Widget",
						quantity: 3,
						reserved: 1,
						available: 2,
						lowStockThreshold: 5,
					},
				]}
			/>,
		);
		expect(html).toContain("product is");
	});

	it("uses plural wording for multiple products", () => {
		const html = render(
			<LowStockAlertEmail
				items={[
					{
						productId: "p1",
						productName: "A",
						quantity: 3,
						reserved: 1,
						available: 2,
						lowStockThreshold: 5,
					},
					{
						productId: "p2",
						productName: "B",
						quantity: 2,
						reserved: 0,
						available: 2,
						lowStockThreshold: 5,
					},
				]}
			/>,
		);
		expect(html).toContain("products are");
	});

	it("shows admin link when adminUrl is provided", () => {
		const html = render(
			<LowStockAlertEmail
				items={[
					{
						productId: "p1",
						productName: "Widget",
						quantity: 3,
						reserved: 1,
						available: 2,
						lowStockThreshold: 5,
					},
				]}
				adminUrl="https://admin.example.com/inventory"
			/>,
		);
		expect(html).toContain("Manage Inventory");
		expect(html).toContain("https://admin.example.com/inventory");
	});
});
