import type { Label } from '@prisma/client';
import {
  DEFAULT_LABEL_COLOR,
  labelColorSchema,
  labelKey,
  MAX_LABELS,
  type CreateLabelData,
  type LabelDto,
  type UpdateLabelInput,
} from '@errandipity/shared';
import { prisma } from './db';
import { ConflictError, NotFoundError } from './errors';

export const toLabelDto = ({ id, name, color }: Label): LabelDto => ({
  id,
  name,
  color: labelColorSchema.catch(DEFAULT_LABEL_COLOR).parse(color),
});
export const byLabelName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

export async function listLabels(): Promise<LabelDto[]> {
  const labels = await prisma.label.findMany();
  return labels.sort(byLabelName).map(toLabelDto);
}

/** Names must stay distinct once case and spaces are ignored, so that ## finds exactly one. */
function assertNameFree(labels: Label[], name: string, exceptId?: string) {
  const taken = labels.some((label) => label.id !== exceptId && labelKey(label.name) === labelKey(name));
  if (taken) throw new ConflictError(`There is already a label called "${name}"`);
}

export async function createLabel({ name, color }: CreateLabelData): Promise<LabelDto> {
  return prisma.$transaction(async (tx) => {
    const labels = await tx.label.findMany();
    if (labels.length >= MAX_LABELS) throw new ConflictError(`You can have at most ${MAX_LABELS} labels`);
    assertNameFree(labels, name);
    return toLabelDto(await tx.label.create({ data: { name, color } }));
  });
}

/** Changes a label's name, its colour, or both. */
export async function updateLabel(id: string, changes: UpdateLabelInput): Promise<LabelDto> {
  return prisma.$transaction(async (tx) => {
    const labels = await tx.label.findMany();
    if (!labels.some((label) => label.id === id)) throw new NotFoundError(`Label ${id} not found`);
    if (changes.name !== undefined) assertNameFree(labels, changes.name, id);
    return toLabelDto(await tx.label.update({ where: { id }, data: changes }));
  });
}

/** Removes the label from every task and series that carries it. */
export async function deleteLabel(id: string): Promise<{ ok: true }> {
  const { count } = await prisma.label.deleteMany({ where: { id } });
  if (count === 0) throw new NotFoundError(`Label ${id} not found`);
  return { ok: true };
}
