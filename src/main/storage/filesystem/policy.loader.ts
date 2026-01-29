/**
 * Policy YAML file loader
 *
 * Loads and validates policy definitions from YAML files.
 */

import { readFile, readdir } from 'fs/promises';
import { join, extname } from 'path';
import { parse as parseYaml } from 'yaml';
import Ajv from 'ajv';
import { createHash } from 'crypto';
import type { Policy } from '../../../types';
import { SCHEMAS } from '../../../types/schemas';
import { PolicyValidationError } from '../errors';

const ajv = new Ajv({ allErrors: true });
const validatePolicy = ajv.compile(SCHEMAS.POLICY);

/**
 * Policy file loader with YAML parsing and validation
 */
export class PolicyFileLoader {
  /**
   * Load all policies from a directory
   */
  async loadPolicies(directory: string): Promise<Policy[]> {
    const files = await this.findYamlFiles(directory);
    const policies: Policy[] = [];

    for (const file of files) {
      try {
        const policy = await this.loadPolicyFile(file);
        policies.push(policy);
      } catch (error) {
        console.error(`Failed to load policy from ${file}:`, error);
        throw error;
      }
    }

    return policies;
  }

  /**
   * Load a single policy from a YAML file
   */
  async loadPolicyFile(filePath: string): Promise<Policy> {
    // Read file
    const content = await readFile(filePath, 'utf-8');

    // Parse YAML
    const parsed = parseYaml(content);
    if (!parsed || typeof parsed !== 'object') {
      throw new PolicyValidationError(filePath, [
        {
          message: 'Invalid YAML: must be an object',
        },
      ]);
    }

    // Validate against schema
    const valid = validatePolicy(parsed);
    if (!valid) {
      throw new PolicyValidationError(filePath, validatePolicy.errors || []);
    }

    // Calculate version hash if not provided
    const policyData = parsed as unknown as Record<string, unknown>;
    const versionHash =
      (policyData.version_hash as string) || this.calculateVersionHash(policyData);

    // Return policy with version hash
    return {
      ...policyData,
      version_hash: versionHash,
    } as Policy;
  }

  /**
   * Find all YAML files in a directory
   */
  private async findYamlFiles(directory: string): Promise<string[]> {
    try {
      const entries = await readdir(directory, { withFileTypes: true });
      const yamlFiles: string[] = [];

      for (const entry of entries) {
        if (entry.isFile()) {
          const ext = extname(entry.name).toLowerCase();
          if (ext === '.yaml' || ext === '.yml') {
            yamlFiles.push(join(directory, entry.name));
          }
        }
      }

      return yamlFiles;
    } catch (error) {
      throw new Error(`Failed to read directory ${directory}: ${(error as Error).message}`);
    }
  }

  /**
   * Calculate version hash from policy content
   */
  private calculateVersionHash(policy: Record<string, unknown>): string {
    // Create canonical representation (sorted keys)
    const canonical = JSON.stringify(policy, Object.keys(policy).sort());

    // Calculate SHA-256 hash
    return createHash('sha256').update(canonical).digest('hex');
  }
}
