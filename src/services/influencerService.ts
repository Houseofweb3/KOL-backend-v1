import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import csv from 'csv-parser';
import { AppDataSource } from '../data-source';
import { Admin } from '../entity/Admin';
import { InfluencerPR } from '../entity/InfluencerPR';
import { User } from '../entity/User';
import { UserSelectedNiche } from '../entity/UserSelectedNiche';
import { UserReferencePriority } from '../entity/UserReferencePriority';
import { In } from 'typeorm'; 

interface CSVRow {
  Influencer: string;
  Link: string;
  Category: string;
  CredibiltyScore: string;
  EngagementRate: string;
  EngagementType: string;
  CollabVelocity: string;
  ContentType: string;
  Motive: string;
  Package: string;
  PriceOfPackage: number;
  Geography: string;
  Platform: string;
  IndividualPrice: number;
  Description: string;
  Niche: string;
  Followers: number;
  InvestorType: string;
}

export const uploadCSV = async (filePath: string, adminId: string) => {
  const adminRepository = AppDataSource.getRepository(Admin);
  const influencerPRRepository = AppDataSource.getRepository(InfluencerPR);

  let insertedRows = 0;
  let skippedRows = 0;
  let skippedReasons: { [key: string]: number } = {};

  try {
    const admin = await adminRepository.findOne({
      where: {
        id: adminId,
        status: "active",
      },
      select: {
        fullname: true,
      },
    });

    if (!admin || !admin.fullname) {
      throw new Error(`Admin with id ${adminId} is not active or does not have a fullname.`);
    }

    const readStream = fs.createReadStream(filePath).pipe(csv());

    for await (const row of readStream) {
      console.log("Processing row:", row);

      const capitalizedRow: CSVRow = {
        Influencer: capitalizeWords(row.Influencer || "N/A"),
        Link: row.Link || "N/A",
        Category: capitalizeWords(row.Category || "N/A"),
        CredibiltyScore: capitalizeWords(row['Credibility Score'] || "N/A"),
        EngagementRate: capitalizeWords(row['Engagement Rate'] || "N/A"),
        EngagementType: capitalizeWords(row['Engagement Type'] || "N/A"),
        CollabVelocity: capitalizeWords(row['Collab Velocity'] || "N/A"),
        ContentType: capitalizeWords(row['Content type'] || "N/A"),
        Motive: capitalizeWords(row.Motive || "N/A"),
        Package: capitalizeWords(row.Package || "N/A"),
        PriceOfPackage: parseFloat(row['Price of Package'] || 0),
        Geography: capitalizeWords(row.Geography || "N/A"),
        Platform: capitalizeWords(row.Platform || "N/A"),
        IndividualPrice: parseFloat(row['Individual Price'] || 0),
        Description: row.Description || "N/A",
        Niche: capitalizeWords(row.Niche || "N/A"),
        Followers: parseInt(row.Followers || 0),
        InvestorType: capitalizeWords(row['Investor Type'] || "N/A"),
      };

      const existingProduct = await influencerPRRepository.findOne({
        where: {
          admin_id: adminId,
          name: capitalizedRow.Influencer,
          category_name: capitalizedRow.Category,
          subscribers: capitalizedRow.Followers,
          geography: capitalizedRow.Geography,
          platform: capitalizedRow.Platform,
          credibilty_score: capitalizedRow.CredibiltyScore,
          engagement_rate: capitalizedRow.EngagementRate,
          engagement_type: capitalizedRow.EngagementType,
          collab_velocity: capitalizedRow.CollabVelocity,
          content_type: capitalizedRow.ContentType,
          motive: capitalizedRow.Motive,
          packages: capitalizedRow.Package,
          investor_type: capitalizedRow.InvestorType,
          link: capitalizedRow.Link,
        },
      });

      if (existingProduct) {
        skippedRows++;
        skippedReasons["duplicate"] = (skippedReasons["duplicate"] || 0) + 1;
        continue;
      }

      if (!capitalizedRow.IndividualPrice && capitalizedRow.IndividualPrice !== 0) {
        skippedRows++;
        skippedReasons["invalid_price"] = (skippedReasons["invalid_price"] || 0) + 1;
        continue;
      }

      const newInfluencerPR = influencerPRRepository.create({
        id: uuidv4(),
        admin_id: adminId,
        niche: capitalizedRow.Niche,
        name: capitalizedRow.Influencer,
        category_name: capitalizedRow.Category,
        subscribers: capitalizedRow.Followers,
        geography: capitalizedRow.Geography,
        platform: capitalizedRow.Platform,
        price: capitalizedRow.IndividualPrice,
        credibilty_score: capitalizedRow.CredibiltyScore,
        engagement_rate: capitalizedRow.EngagementRate,
        engagement_type: capitalizedRow.EngagementType,
        collab_velocity: capitalizedRow.CollabVelocity,
        content_type: capitalizedRow.ContentType,
        motive: capitalizedRow.Motive,
        description: capitalizedRow.Description,
        packages: capitalizedRow.Package,
        investor_type: capitalizedRow.InvestorType,
        link: capitalizedRow.Link,
        createdBy: admin.fullname,
        updatedBy: admin.fullname,
      });

      await influencerPRRepository.save(newInfluencerPR);

      insertedRows++;
    }

    return { message: "CSV processed successfully", insertedRows, skippedRows, skippedReasons };
  } catch (error: any) {
    return { status: 500, message: "Error saving data", error: error.message };
  } finally {
    fs.unlinkSync(filePath);
  }
};

function capitalizeWords(str: string): string {
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export const getInfluencersWithHiddenPrices = async (user_id?: string) => {
    const userRepository = AppDataSource.getRepository(User);
    const userSelectedNicheRepository = AppDataSource.getRepository(UserSelectedNiche);
    const userReferencePriorityRepository = AppDataSource.getRepository(UserReferencePriority);
    const influencerPRRepository = AppDataSource.getRepository(InfluencerPR);
  
    let userSelectedNiche;
    let referenceNames: string[] = [];
  
    if (user_id) {
      const user = await userRepository.findOne({
        where: { id: user_id }
      });
  
      if (user) {
        if (user.status !== 'active') {
          throw new Error('User is not active');
        }
  
        userSelectedNiche = await userSelectedNicheRepository.findOne({
          where: { user_id: user_id }
        });
  
        if (userSelectedNiche) {
          const userReferencePriority = await userReferencePriorityRepository.find({
            where: { user_id: user_id }
          });
  
          referenceNames = userReferencePriority.map(reference => reference.reference_name);
        }
      }
    }
  
    const influencers = await influencerPRRepository.find({
      where: {
        ...(userSelectedNiche && { niche: In(userSelectedNiche.niche_name) }),
        ...(referenceNames.length > 0 && { investor_type: In(referenceNames) })
      },
      order: {
        price: 'asc'
      }
    });
  
    const influencersWithHiddenPrices = influencers.map(influencer => ({
      ...influencer,
      hiddenPrice: getHiddenPrice(influencer.price)
    }));
  
    return influencersWithHiddenPrices;
  };
  
  const getHiddenPrice = (price: number): string => {
    if (price <= 1000) return '$';
    if (price > 1000 && price <= 2000) return '$$';
    if (price > 2000 && price <= 3000) return '$$$';
    if (price > 3000) return '$$$$';
    return '';
  };