import type { Prisma } from '@prisma/client';
import {
  DEFAULT_PROJECT_SORT,
  projectSortSchema,
  type CreateProjectInput,
  type ProjectDto,
  type SectionDto,
  type SectionInput,
  type UpdateProjectInput,
} from '@errandipity/shared';
import { prisma } from './db';
import { ConflictError, NotFoundError } from './errors';

const byCreation = { createdAt: 'asc' } as const;
const projectInclude = { sections: { orderBy: byCreation } } satisfies Prisma.ProjectInclude;
type ProjectWithSections = Prisma.ProjectGetPayload<{ include: typeof projectInclude }>;

const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

function toDto(project: ProjectWithSections, counts: { done: number; total: number }): ProjectDto {
  return {
    id: project.id,
    name: project.name,
    objective: project.objective,
    description: project.description,
    targetDate: project.targetDate,
    sortOrder: projectSortSchema.catch(DEFAULT_PROJECT_SORT).parse(project.sortOrder),
    sections: project.sections.map(({ id, name }) => ({ id, name })),
    ...counts,
  };
}

/** Task counts for one project, counted from its tasks rather than stored. */
async function countsFor(tx: Prisma.TransactionClient, projectId: string) {
  const [done, total] = await Promise.all([
    tx.task.count({ where: { projectId, status: 'done' } }),
    tx.task.count({ where: { projectId } }),
  ]);
  return { done, total };
}

async function getProject(tx: Prisma.TransactionClient, id: string): Promise<ProjectWithSections> {
  const project = await tx.project.findUnique({ where: { id }, include: projectInclude });
  if (!project) throw new NotFoundError(`Project ${id} not found`);
  return project;
}

/** Every project in creation order, each with its sections and task counts. */
export async function listProjects(): Promise<ProjectDto[]> {
  const [projects, groups] = await Promise.all([
    prisma.project.findMany({ include: projectInclude, orderBy: byCreation }),
    prisma.task.groupBy({ by: ['projectId', 'status'], where: { projectId: { not: null } }, _count: { _all: true } }),
  ]);
  return projects.map((project) => {
    const own = groups.filter((group) => group.projectId === project.id);
    const count = (rows: typeof own) => rows.reduce((sum, row) => sum + row._count._all, 0);
    return toDto(project, { done: count(own.filter((row) => row.status === 'done')), total: count(own) });
  });
}

export async function createProject({ name }: CreateProjectInput): Promise<ProjectDto> {
  return prisma.$transaction(async (tx) => {
    const projects = await tx.project.findMany();
    if (projects.some((project) => sameName(project.name, name))) {
      throw new ConflictError(`There is already a project called "${name}"`);
    }
    const project = await tx.project.create({ data: { name }, include: projectInclude });
    return toDto(project, { done: 0, total: 0 });
  });
}

export async function updateProject(id: string, changes: UpdateProjectInput): Promise<ProjectDto> {
  return prisma.$transaction(async (tx) => {
    await getProject(tx, id);
    const { name } = changes;
    if (name !== undefined) {
      const others = await tx.project.findMany({ where: { id: { not: id } } });
      if (others.some((project) => sameName(project.name, name))) {
        throw new ConflictError(`There is already a project called "${name}"`);
      }
    }
    const project = await tx.project.update({ where: { id }, data: changes, include: projectInclude });
    return toDto(project, await countsFor(tx, id));
  });
}

/** Deletes the project with its sections and every task in it, completed ones included. */
export async function deleteProject(id: string): Promise<{ ok: true }> {
  return prisma.$transaction(async (tx) => {
    await getProject(tx, id);
    // Deleting a series deletes its tasks. Done here rather than left to the cascade from
    // Project, so that it does not depend on the order the database applies cascades in.
    await tx.taskSeries.deleteMany({ where: { projectId: id } });
    await tx.project.delete({ where: { id } });
    return { ok: true };
  });
}

function assertSectionNameFree(project: ProjectWithSections, name: string, exceptId?: string) {
  const taken = project.sections.some((section) => section.id !== exceptId && sameName(section.name, name));
  if (taken) throw new ConflictError(`This project already has a section called "${name}"`);
}

export async function createSection(projectId: string, { name }: SectionInput): Promise<SectionDto> {
  return prisma.$transaction(async (tx) => {
    assertSectionNameFree(await getProject(tx, projectId), name);
    const section = await tx.projectSection.create({ data: { projectId, name } });
    return { id: section.id, name: section.name };
  });
}

export async function renameSection(id: string, { name }: SectionInput): Promise<SectionDto> {
  return prisma.$transaction(async (tx) => {
    const section = await tx.projectSection.findUnique({ where: { id } });
    if (!section) throw new NotFoundError(`Section ${id} not found`);
    assertSectionNameFree(await getProject(tx, section.projectId), name, id);
    const renamed = await tx.projectSection.update({ where: { id }, data: { name } });
    return { id: renamed.id, name: renamed.name };
  });
}

/** Removes the section. Its tasks stay in the project, without a section. */
export async function deleteSection(id: string): Promise<{ ok: true }> {
  const { count } = await prisma.projectSection.deleteMany({ where: { id } });
  if (count === 0) throw new NotFoundError(`Section ${id} not found`);
  return { ok: true };
}

/**
 * Checks that a task can be put in this project and section: both exist, and the
 * section belongs to the project.
 */
export async function assertPlacement(tx: Prisma.TransactionClient, projectId: string | null, sectionId: string | null) {
  if (projectId === null) {
    if (sectionId !== null) throw new ConflictError('A section needs a project');
    return;
  }
  const project = await getProject(tx, projectId);
  if (sectionId !== null && !project.sections.some((section) => section.id === sectionId)) {
    throw new NotFoundError('That section is not part of the project');
  }
}
