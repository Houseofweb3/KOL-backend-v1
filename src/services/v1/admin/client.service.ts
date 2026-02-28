import HttpStatus from 'http-status-codes';
import { AppDataSource } from '../../../config/data-source';
import { Client } from '../../../entity/client.entity';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export interface ListClientsOptions {
    page?: number;
    limit?: number;
    search?: string;
    categories?: string;
    includeDeleted?: boolean;
}

export interface ListClientsResult {
    clients: Client[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export const listClients = async (options: ListClientsOptions = {}): Promise<ListClientsResult> => {
    const page = Math.max(1, options.page ?? DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, options.limit ?? DEFAULT_LIMIT));
    const search = options.search?.trim() ?? '';
    const categories = options.categories?.trim() ?? '';
    const includeDeleted = options.includeDeleted ?? false;

    const repo = AppDataSource.getRepository(Client);
    const qb = repo
        .createQueryBuilder('c')
        .orderBy('c.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

    if (!includeDeleted) {
        qb.andWhere('c.isDeleted = :isDeleted', { isDeleted: false });
    }
    if (categories) {
        qb.andWhere('c.categories ILike :categories', { categories: `%${categories}%` });
    }
    if (search) {
        qb.andWhere(
            '(c.name ILike :search OR c.email ILike :search OR c.website ILike :search OR c.telegramId ILike :search OR c.whatsAppNumber ILike :search OR c.categories ILike :search OR c.campaignGoals ILike :search OR c.customBrief ILike :search)',
            { search: `%${search}%` }
        );
    }

    const [clients, total] = await qb.getManyAndCount();
    return { clients, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const getClientById = async (id: string) => {
    const repo = AppDataSource.getRepository(Client);
    const client = await repo.findOne({ where: { id } });
    if (!client) {
        const err = new Error('Client not found');
        (err as any).status = HttpStatus.NOT_FOUND;
        throw err;
    }
    return client;
};

export const createClient = async (data: {
    name: string;
    email: string;
    website?: string | null;
    telegramId?: string | null;
    whatsAppNumber?: string | null;
    categories?: string | null;
    campaignGoals?: string | null;
    monetizationModel?: string | null;
    primaryAudienceGeography?: string | null;
    ageRange?: string | null;
    genderSkew?: string | null;
    campaignStartTimeline?: string | null;
    customBrief?: string | null;
}) => {
    const repo = AppDataSource.getRepository(Client);
    const existing = await repo.findOne({ where: { email: data.email.toLowerCase() } });
    if (existing && !existing.isDeleted) {
        const err = new Error('Client with this email already exists');
        (err as any).status = HttpStatus.CONFLICT;
        throw err;
    }
    const client = repo.create({
        name: data.name,
        email: data.email.toLowerCase(),
        website: data.website ?? null,
        telegramId: data.telegramId ?? null,
        whatsAppNumber: data.whatsAppNumber ?? null,
        categories: data.categories ?? null,
        campaignGoals: data.campaignGoals ?? null,
        monetizationModel: data.monetizationModel ?? null,
        primaryAudienceGeography: data.primaryAudienceGeography ?? null,
        ageRange: data.ageRange ?? null,
        genderSkew: data.genderSkew ?? null,
        campaignStartTimeline: data.campaignStartTimeline ?? null,
        customBrief: data.customBrief ?? null,
        isDeleted: false,
    });
    return repo.save(client);
};

export const updateClient = async (
    id: string,
    data: Partial<{
        name: string;
        email: string;
        website: string | null;
        telegramId: string | null;
        whatsAppNumber: string | null;
        categories: string | null;
        campaignGoals: string | null;
        monetizationModel: string | null;
        primaryAudienceGeography: string | null;
        ageRange: string | null;
        genderSkew: string | null;
        campaignStartTimeline: string | null;
        customBrief: string | null;
    }>
) => {
    const repo = AppDataSource.getRepository(Client);
    const client = await repo.findOne({ where: { id } });
    if (!client) {
        const err = new Error('Client not found');
        (err as any).status = HttpStatus.NOT_FOUND;
        throw err;
    }
    if (data.name != null) client.name = data.name;
    if (data.email != null) client.email = data.email.toLowerCase();
    if (data.website !== undefined) client.website = data.website;
    if (data.telegramId !== undefined) client.telegramId = data.telegramId;
    if (data.whatsAppNumber !== undefined) client.whatsAppNumber = data.whatsAppNumber;
    if (data.categories !== undefined) client.categories = data.categories;
    if (data.campaignGoals !== undefined) client.campaignGoals = data.campaignGoals;
    if (data.monetizationModel !== undefined) client.monetizationModel = data.monetizationModel;
    if (data.primaryAudienceGeography !== undefined) client.primaryAudienceGeography = data.primaryAudienceGeography;
    if (data.ageRange !== undefined) client.ageRange = data.ageRange;
    if (data.genderSkew !== undefined) client.genderSkew = data.genderSkew;
    if (data.campaignStartTimeline !== undefined) client.campaignStartTimeline = data.campaignStartTimeline;
    if (data.customBrief !== undefined) client.customBrief = data.customBrief;
    return repo.save(client);
};

export const deleteClient = async (id: string) => {
    const repo = AppDataSource.getRepository(Client);
    const client = await repo.findOne({ where: { id } });
    if (!client) {
        const err = new Error('Client not found');
        (err as any).status = HttpStatus.NOT_FOUND;
        throw err;
    }
    client.isDeleted = true;
    client.deletedAt = new Date();
    return repo.save(client);
};
