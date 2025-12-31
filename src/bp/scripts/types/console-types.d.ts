// Minecraft Bedrock's scripting environment has the "console" object available, but their types are
// not exposed, so they are minimally declared here.

/**
 * Minimal declaration for the global 'console' object.
 * This satisfies the type checker without including the whole `lib.dom.d.ts`.
 */
interface Console {
	log(...data: any[]): void;
	warn(...data: any[]): void;
	error(...data: any[]): void;
	info(...data: any[]): void;
	debug(...data: any[]): void;
}

declare const console: Console;
