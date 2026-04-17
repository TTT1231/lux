import { describe, expect, it } from 'vitest';
import { buildCommands, parseProxy } from '../../src/commands/vpn';

describe('buildCommands', () => {
	const httpProxy = 'http://127.0.0.1:9876/';
	const socksProxy = 'socks5://127.0.0.1:9876';

	it('generates CMD set commands', () => {
		const result = buildCommands('cmd', httpProxy, socksProxy);
		expect(result).toContain('set https_proxy=http://127.0.0.1:9876/');
		expect(result).toContain('set http_proxy=http://127.0.0.1:9876/');
		expect(result).toContain('set all_proxy=socks5://127.0.0.1:9876');
		expect(result.split('\r\n').length).toBe(3);
	});

	it('generates PowerShell env commands', () => {
		const result = buildCommands('pw', httpProxy, socksProxy);
		expect(result).toContain('$env:https_proxy="http://127.0.0.1:9876/"');
		expect(result).toContain('$env:http_proxy="http://127.0.0.1:9876/"');
		expect(result).toContain('$env:all_proxy="socks5://127.0.0.1:9876"');
	});

	it('generates Bash export commands', () => {
		const result = buildCommands('bash', httpProxy, socksProxy);
		expect(result).toContain('export https_proxy=http://127.0.0.1:9876/');
		expect(result).toContain('export http_proxy=http://127.0.0.1:9876/');
		expect(result).toContain('export all_proxy=socks5://127.0.0.1:9876');
		expect(result.split('\n').length).toBe(3);
	});
});

describe('parseProxy', () => {
	it('parses full URL with protocol', () => {
		const result = parseProxy('http://127.0.0.1:9876');
		expect(result.httpProxy).toBe('http://127.0.0.1:9876/');
		expect(result.socksProxy).toBe('socks5://127.0.0.1:9876');
	});

	it('parses address without protocol', () => {
		const result = parseProxy('192.168.1.1:8080');
		expect(result.httpProxy).toBe('http://192.168.1.1:8080/');
		expect(result.socksProxy).toBe('socks5://192.168.1.1:8080');
	});

	it('handles custom port', () => {
		const result = parseProxy('http://localhost:7890');
		expect(result.httpProxy).toBe('http://localhost:7890/');
		expect(result.socksProxy).toBe('socks5://localhost:7890');
	});
});
