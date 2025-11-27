import type { Issues } from './types/issues.js';
import type { MainOptions } from './util/create-options.js';
export declare class IssueFixer {
    options: MainOptions;
    constructor(options: MainOptions);
    fixIssues(issues: Issues): Promise<Set<string>>;
    private removeUnusedFiles;
    private removeUnusedExports;
    private removeUnusedDependencies;
    private removeUnusedCatalogEntries;
}
