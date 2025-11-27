import { hasDependency } from '../../util/plugin.js';
import { entry, resolveConfig } from '../playwright/index.js';
const title = 'Playwright for components';
const enablers = [/^@playwright\/experimental-ct-/];
const isEnabled = ({ dependencies }) => hasDependency(dependencies, enablers);
const config = ['playwright-ct.config.{js,ts}', 'playwright/index.{js,ts,jsx,tsx}'];
const plugin = {
    title,
    enablers,
    isEnabled,
    config,
    entry,
    resolveConfig,
};
export default plugin;
