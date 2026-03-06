import { Icon } from "./core/icon";
import { Kbd } from "./core/kbd";
import { Spinner } from "./core/spinner";
import { View } from "./core/view";

// biome-ignore lint/suspicious/noExplicitAny: MDX component map accepts any React component
const uiComponents: Record<string, any> = {
	Icon,
	Kbd,
	Spinner,
	View,
};

export default uiComponents;
