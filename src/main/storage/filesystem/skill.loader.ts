/**
 * Skill YAML file loader
 *
 * Loads and validates skill definitions from YAML files.
 */

import { readFile, readdir } from 'fs/promises';
import { join, extname } from 'path';
import { parse as parseYaml } from 'yaml';
import Ajv from 'ajv';
import { createHash } from 'crypto';
import type { Skill } from '../../../types';
import { SCHEMAS } from '../../../types/schemas';
import { SkillValidationError } from '../errors';

const ajv = new Ajv({ allErrors: true });
const validateSkill = ajv.compile(SCHEMAS.SKILL);

/**
 * Skill file loader with YAML parsing and validation
 */
export class SkillFileLoader {
  /**
   * Load all skills from a directory
   */
  async loadSkills(directory: string): Promise<Skill[]> {
    const files = await this.findYamlFiles(directory);
    const skills: Skill[] = [];

    for (const file of files) {
      try {
        const skill = await this.loadSkillFile(file);
        skills.push(skill);
      } catch (error) {
        console.error(`Failed to load skill from ${file}:`, error);
        throw error;
      }
    }

    return skills;
  }

  /**
   * Load a single skill from a YAML file
   */
  async loadSkillFile(filePath: string): Promise<Skill> {
    // Read file
    const content = await readFile(filePath, 'utf-8');

    // Parse YAML
    const parsed = parseYaml(content);
    if (!parsed || typeof parsed !== 'object') {
      throw new SkillValidationError(filePath, [
        {
          message: 'Invalid YAML: must be an object',
        },
      ]);
    }

    // Validate against schema
    const valid = validateSkill(parsed);
    if (!valid) {
      throw new SkillValidationError(filePath, validateSkill.errors || []);
    }

    // Calculate version hash if not provided
    const skillData = parsed as unknown as Record<string, unknown>;
    const versionHash = (skillData.version_hash as string) || this.calculateVersionHash(skillData);

    // Return skill with version hash
    return {
      ...skillData,
      version_hash: versionHash,
    } as Skill;
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
   * Calculate version hash from skill content
   */
  private calculateVersionHash(skill: Record<string, unknown>): string {
    // Create canonical representation (sorted keys)
    const canonical = JSON.stringify(skill, Object.keys(skill).sort());

    // Calculate SHA-256 hash
    return createHash('sha256').update(canonical).digest('hex');
  }
}
