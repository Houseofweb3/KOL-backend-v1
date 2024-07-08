// import { AppDataSource } from '../config/data-source';
// import { InfluencerPR } from '../entity/InfluencerPR';
// import { PackageHeader } from '../entity/PackageHeader';

// export const searchInfluencerPRByName = async (name: string): Promise<InfluencerPR[]> => {
//   const influencerPRRepository = AppDataSource.getRepository(InfluencerPR);
  
//   const influencerPRs = await influencerPRRepository.createQueryBuilder('influencerPR')
//     .where('influencerPR.name ILIKE :name', { name: `%${name}%` })
//     .getMany();
    
//   return influencerPRs;
// };

// export const searchPackageByHeader = async (header: string): Promise<PackageHeader[]> => {
//     const packageHeaderRepository = AppDataSource.getRepository(PackageHeader);
    
//     // Using ILIKE for case-insensitive search and `%` for partial match
//     const packageHeaders = await packageHeaderRepository.createQueryBuilder('packageHeader')
//       .leftJoinAndSelect('packageHeader.packages', 'packages')
//       .where('packageHeader.header ILIKE :header', { header: `%${header}%` })
//       .getMany();
      
//     return packageHeaders;
//   };