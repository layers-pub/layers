/**
 * Client-side exporter for bead JSONLines format.
 *
 * Converts Layers resource and judgment records into bead-compatible
 * JSONLines output for download. Each output line is a JSON object
 * with a `type` discriminator field.
 *
 * @module
 */

/**
 * A Layers feature map entry (key-value pair).
 */
interface FeatureEntry {
  readonly key: string;
  readonly value: string;
}

/**
 * A Layers feature map containing an array of feature entries.
 */
interface FeatureMap {
  readonly entries: readonly FeatureEntry[];
}

/**
 * A knowledge reference in a Layers record.
 */
interface KnowledgeRef {
  readonly source: string;
  readonly identifier: string;
  readonly label?: string;
}

/**
 * A Layers constraint object.
 */
interface Constraint {
  readonly expression: string;
  readonly expressionFormatUri?: string;
  readonly description?: string;
}

/**
 * A slot definition in a Layers template record.
 */
interface Slot {
  readonly name: string;
  readonly required?: boolean;
  readonly defaultValue?: string;
  readonly description?: string;
  readonly constraints?: readonly Constraint[];
}

/**
 * A slot filling in a Layers filling record.
 */
interface SlotFilling {
  readonly slotName: string;
  readonly entryRef?: string;
  readonly literalValue?: string;
  readonly renderedForm?: string;
}

/**
 * A pub.layers.resource.entry record for export.
 */
interface ExportEntry {
  readonly form: string;
  readonly lemma?: string;
  readonly languages?: readonly string[];
  readonly features?: FeatureMap;
  readonly knowledgeRefs?: readonly KnowledgeRef[];
}

/**
 * A pub.layers.resource.template record for export.
 */
interface ExportTemplate {
  readonly name?: string;
  readonly text: string;
  readonly languages?: readonly string[];
  readonly slots: readonly Slot[];
  readonly constraints?: readonly Constraint[];
}

/**
 * A pub.layers.resource.filling record for export.
 */
interface ExportFilling {
  readonly templateRef: string;
  readonly slotFillings: readonly SlotFilling[];
  readonly renderedText?: string;
  readonly strategy?: string;
}

/**
 * A pub.layers.judgment.experimentDef record for export.
 */
interface ExportExperiment {
  readonly name: string;
  readonly description?: string;
  readonly measureType?: string;
  readonly taskType?: string;
  readonly scaleMin?: number;
  readonly scaleMax?: number;
  readonly labels?: readonly string[];
}

/**
 * Input data for the bead JSONLines exporter.
 */
interface ProjectExportData {
  readonly entries?: readonly ExportEntry[];
  readonly templates?: readonly ExportTemplate[];
  readonly fillings?: readonly ExportFilling[];
  readonly experiments?: readonly ExportExperiment[];
}

/**
 * Converts a Layers FeatureMap to a flat dictionary for bead format.
 *
 * @param featureMap - the Layers feature map with entries array
 * @returns a flat key-value dictionary
 */
function featureMapToDict(featureMap: FeatureMap): Record<string, string> {
  const dict: Record<string, string> = {};
  for (const entry of featureMap.entries) {
    dict[entry.key] = entry.value;
  }
  return dict;
}

/**
 * Converts an array of Layers slot fillings to a bead slot_fillings dictionary.
 *
 * @param slotFillings - the Layers slot filling array
 * @returns a dictionary mapping slot names to filler values
 */
function slotFillingsToDict(slotFillings: readonly SlotFilling[]): Record<string, string> {
  const dict: Record<string, string> = {};
  for (const filling of slotFillings) {
    dict[filling.slotName] = filling.literalValue ?? filling.renderedForm ?? filling.entryRef ?? '';
  }
  return dict;
}

/**
 * Exports a single entry record as a bead JSONLines object.
 */
function exportEntry(entry: ExportEntry): Record<string, unknown> {
  const obj: Record<string, unknown> = {
    type: 'entry',
    form: entry.form,
  };

  if (entry.lemma) {
    obj['lemma'] = entry.lemma;
  }

  if (entry.languages && entry.languages.length > 0) {
    obj['languages'] = entry.languages;
  }

  if (entry.features && entry.features.entries.length > 0) {
    obj['features'] = featureMapToDict(entry.features);
  }

  if (entry.knowledgeRefs && entry.knowledgeRefs.length > 0) {
    obj['knowledgeRefs'] = entry.knowledgeRefs.map((ref) => ({
      source: ref.source,
      id: ref.identifier,
      label: ref.label,
    }));
  }

  return obj;
}

/**
 * Exports a single template record as a bead JSONLines object.
 */
function exportTemplate(template: ExportTemplate): Record<string, unknown> {
  const obj: Record<string, unknown> = {
    type: 'template',
    text: template.text,
    slots: template.slots.map((slot) => {
      const s: Record<string, unknown> = { name: slot.name };
      if (slot.required !== undefined) s['required'] = slot.required;
      if (slot.defaultValue) s['defaultValue'] = slot.defaultValue;
      if (slot.description) s['description'] = slot.description;
      if (slot.constraints && slot.constraints.length > 0) {
        s['constraints'] = slot.constraints.map((c) => c.expression);
      }
      return s;
    }),
  };

  if (template.name) {
    obj['name'] = template.name;
  }

  if (template.languages && template.languages.length > 0) {
    obj['languages'] = template.languages;
  }

  if (template.constraints && template.constraints.length > 0) {
    obj['constraints'] = template.constraints.map((c) => c.expression);
  }

  return obj;
}

/**
 * Exports a single filling record as a bead JSONLines object.
 */
function exportFilling(filling: ExportFilling): Record<string, unknown> {
  const obj: Record<string, unknown> = {
    type: 'filling',
    templateRef: filling.templateRef,
    slotFillings: slotFillingsToDict(filling.slotFillings),
  };

  if (filling.renderedText) {
    obj['renderedText'] = filling.renderedText;
  }

  if (filling.strategy) {
    obj['strategy'] = filling.strategy;
  }

  return obj;
}

/**
 * Exports a single experiment record as a bead JSONLines object.
 */
function exportExperimentDef(experiment: ExportExperiment): Record<string, unknown> {
  const obj: Record<string, unknown> = {
    type: 'experiment',
    name: experiment.name,
  };

  if (experiment.description) {
    obj['description'] = experiment.description;
  }

  if (experiment.measureType) {
    obj['measureType'] = experiment.measureType;
  }

  if (experiment.taskType) {
    obj['taskType'] = experiment.taskType;
  }

  if (experiment.scaleMin !== undefined) {
    obj['scaleMin'] = experiment.scaleMin;
  }

  if (experiment.scaleMax !== undefined) {
    obj['scaleMax'] = experiment.scaleMax;
  }

  if (experiment.labels && experiment.labels.length > 0) {
    obj['labels'] = [...experiment.labels];
  }

  return obj;
}

/**
 * Exports project data to bead JSONLines format.
 *
 * Converts arrays of Layers resource and judgment records into a
 * single string of newline-delimited JSON objects. Each line has
 * a `type` discriminator field ("entry", "template", "filling",
 * or "experiment").
 *
 * @param projectData - the records to export
 * @returns a JSONLines string with one record per line
 *
 * @example
 * ```typescript
 * const jsonl = exportProjectToBeadJsonlines({
 *   entries: [{ form: "cat", lemma: "cat", features: { entries: [{ key: "pos", value: "NOUN" }] } }],
 *   templates: [{ text: "The {subject} {verb}.", slots: [{ name: "subject" }, { name: "verb" }] }],
 * });
 * // Download as a .jsonl file
 * ```
 */
function exportProjectToBeadJsonlines(projectData: ProjectExportData): string {
  const lines: string[] = [];

  if (projectData.entries) {
    for (const entry of projectData.entries) {
      lines.push(JSON.stringify(exportEntry(entry)));
    }
  }

  if (projectData.templates) {
    for (const template of projectData.templates) {
      lines.push(JSON.stringify(exportTemplate(template)));
    }
  }

  if (projectData.fillings) {
    for (const filling of projectData.fillings) {
      lines.push(JSON.stringify(exportFilling(filling)));
    }
  }

  if (projectData.experiments) {
    for (const experiment of projectData.experiments) {
      lines.push(JSON.stringify(exportExperimentDef(experiment)));
    }
  }

  return lines.join('\n');
}

export { exportProjectToBeadJsonlines, featureMapToDict, slotFillingsToDict };
export type {
  ProjectExportData,
  ExportEntry,
  ExportTemplate,
  ExportFilling,
  ExportExperiment,
  FeatureEntry,
  FeatureMap,
  KnowledgeRef,
  Constraint,
  Slot,
  SlotFilling,
};
