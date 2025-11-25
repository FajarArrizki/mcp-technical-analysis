# Security Policy

## Supported Versions

The following versions of GearTrade MCP Server are currently supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously, especially given the financial nature of this trading software.

### How to Report

1. **DO NOT** open a public GitHub issue for security vulnerabilities
2. Email security concerns to: **fajar.arrizki@gmail.com**
3. Include the following in your report:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Resolution Timeline**: Critical vulnerabilities within 14 days

### After Reporting

- You will receive acknowledgment of your report
- We will investigate and validate the vulnerability
- If accepted, we will work on a fix and coordinate disclosure
- If declined, we will explain our reasoning

### Security Best Practices for Users

When using GearTrade MCP Server:

1. **Never share your API keys** - Keep `walletApiKey` and `accountAddress` private
2. **Use paper trading first** - Test strategies with `useLiveExecutor: false`
3. **Secure your environment** - Don't commit `.env` files or API credentials
4. **Verify tool parameters** - Double-check trade parameters before live execution
5. **Monitor positions** - Regularly review open positions and trading activity

### Scope

The following are in scope for security reports:

- Authentication/authorization bypasses
- Credential exposure vulnerabilities
- Injection vulnerabilities in tool parameters
- Unauthorized trade execution
- Data leakage of sensitive trading information

### Out of Scope

- Trading losses due to market conditions
- Issues with third-party APIs (Hyperliquid, Binance, etc.)
- Social engineering attacks
- Denial of service attacks

## Security Features

GearTrade MCP Server includes several security measures:

- **No hardcoded credentials** - Users provide their own API keys per request
- **Input validation** - Zod schema validation on all tool parameters
- **Paper trading default** - Live execution requires explicit opt-in
- **Position size limits** - Configurable risk management constraints

---

Thank you for helping keep GearTrade MCP Server secure!

